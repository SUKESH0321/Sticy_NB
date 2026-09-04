const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

// JSON file that persists all notes across sessions.
const storePath = path.join(app.getPath('userData'), 'notes.json');

// Default color for new notes (matches the renderer's first palette swatch).
const DEFAULT_NOTE_COLOR = 'bg-yellow-200';

// Default window size used with new notes.
const DEFAULT_NOTE_SIZE = { width: 300, height: 300 };

// Pixel offset applied to each newly created note so notes cascade down-right
// from the focused window instead of stacking perfectly on top of it.
const NEW_NOTE_OFFSET = 30;

/**
 * Reads notes.json and returns the persisted notes array.
 * Returns an empty array when the file does not exist yet.
 * @returns {Array<object>}
 */
function readNotes() {
  try {
    if (!fs.existsSync(storePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to read notes:', error);
    return [];
  }
}

/**
 * Stringifies the notes array and writes it to notes.json.
 * @param {Array<object>} notes
 */
function writeNotes(notes) {
  try {
    fs.mkdirSync(path.dirname(storePath), { recursive: true });
    fs.writeFileSync(storePath, JSON.stringify(notes, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write notes:', error);
  }
}

// Registry of all open note windows keyed by noteId.
// Holding strong references here prevents the garbage collector from
// reclaiming the active BrowserWindow instances while their notes are open.
const activeNotes = new Map();
/**
 * Spawns a new frameless, transparent note window routed to the given noteId.
 * @param {string} noteId     unique identifier for the note
 * @param {number|null} x     optional x coordinate (defaults to OS centering)
 * @param {number|null} y     optional y coordinate (defaults to OS centering)
 */

function createNoteWindow(id, x, y, text = '', color = 'bg-yellow-200') {
  const win = new BrowserWindow({
    width: 300,
    height: 300,
    x: x,
    y: y,
    frame: false,
    transparent: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // Safely encode the text and color into the URL
  const encodedText = encodeURIComponent(text);
  const encodedColor = encodeURIComponent(color);
  const queryParams = `noteId=${id}&text=${encodedText}&color=${encodedColor}`;
  if (app.isPackaged) {
      // In production, load the physical HTML file from Vite's build folder
      win.loadFile(path.join(__dirname, '../dist/index.html'), { search: queryParams });
    } else {
      // In development, load the local Vite server
      win.loadURL(`http://localhost:3000?${queryParams}`);
    }

    activeNotes.set(id, win);
}

// ---------------------------------------------------------------------------
// IPC Bridge — persistent file storage.
// ---------------------------------------------------------------------------

/**
 * Creates a new note, persists it to disk, and spawns its window.
 * @param {number|null} x  optional screen x coordinate (null = OS centering)
 * @param {number|null} y  optional screen y coordinate (null = OS centering)
 */
function handleCreateNote(x = null, y = null) {
  const notes = readNotes();

  const newNote = {
    id: randomUUID(),
    text: '',
    color: DEFAULT_NOTE_COLOR,
    x: x ?? null,
    y: y ?? null,
    ...DEFAULT_NOTE_SIZE,
  };

  notes.push(newNote);
  writeNotes(notes);

  // Pass the text and color here!
  createNoteWindow(newNote.id, x, y, newNote.text, newNote.color);
}

// ... (leave your IPC listeners alone here) ...

// On startup, restore every persisted note or create a fresh one.
app.whenReady().then(() => {
  const notes = readNotes();

  if (notes.length === 0) {
    // First launch: spawn a single default note.
    handleCreateNote();
  } else {
    // Restore each persisted note into its own window.
    for (const note of notes) {
      // YOU WERE MISSING THIS: Pass note.text and note.color into the window!
      createNoteWindow(note.id, note.x ?? null, note.y ?? null, note.text, note.color);
    }
  }
});

ipcMain.on('note:create', (_event, x, y) => {  // Accept explicit coordinates from the renderer, if any were provided.
  let spawnX = Number.isFinite(x) ? x : null;
  let spawnY = Number.isFinite(y) ? y : null;

  // Offset new notes from the currently focused window so they never stack
  // perfectly on top of each other — each new note cascades by 30px.
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) {
    const { x: focusedX, y: focusedY } = focused.getBounds();
    if (spawnX === null) spawnX = focusedX + NEW_NOTE_OFFSET;
    if (spawnY === null) spawnY = focusedY + NEW_NOTE_OFFSET;
  }
  // If there is no focused window (and no explicit coords), spawnX/spawnY stay
  // null and createNoteWindow falls back to the OS default (centered) placement.

  handleCreateNote(spawnX, spawnY);
});

ipcMain.on('note:update', (_event, id, payload = {}) => {
  const notes = readNotes();
  const note = notes.find((n) => n.id === id);
  if (!note) return;

  // Merge the new properties (text, color, position, dimensions, ...).
  Object.assign(note, payload);

  // If the note's position or dimensions changed, sync the physical window.
  const needsBoundsSync = ['x', 'y', 'width', 'height'].some(
    (key) => payload[key] !== undefined,
  );
  const win = activeNotes.get(id);
  if (needsBoundsSync && win && !win.isDestroyed()) {
    const bounds = win.getBounds();
    win.setBounds({
      x: Number.isFinite(payload.x) ? payload.x : bounds.x,
      y: Number.isFinite(payload.y) ? payload.y : bounds.y,
      width: Number.isFinite(payload.width) ? payload.width : bounds.width,
      height: Number.isFinite(payload.height) ? payload.height : bounds.height,
    });
  }

  writeNotes(notes);
});

ipcMain.on('note:delete', (_event, id) => {
  // 1. Remove the note from the persistent JSON store first, so a late
  //    window close can't resurface a deleted note on next launch.
  const notes = readNotes();
  writeNotes(notes.filter((n) => n.id !== id));

  // 2. Retrieve the exact BrowserWindow registered for this noteId.
  const win = activeNotes.get(id);
  if (!win) {
    // Nothing to close — registry entry is already gone or never existed.
    activeNotes.delete(id);
    return;
  }

  // 3. Close that specific window instance if it is still alive.
  if (typeof win.close === 'function' && !win.isDestroyed()) {
    win.close();
  }

  // 4. Guarantee the registry no longer references this note (the window's
  //    own 'closed' handler also clears it, so this is intentionally idempotent).
  activeNotes.delete(id);
});

ipcMain.on('note:deleteAll', () => {
  app.quit();
});



app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) handleCreateNote();
});