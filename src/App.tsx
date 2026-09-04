import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Palette, ListX } from 'lucide-react';

/**
 * Single, standalone sticky-note window.
 * Identified by the ?noteId= query param injected by the Electron main process,
 * and communicates with it exclusively through the window.api IPC bridge.
 */

// Tailwind swatches the main process persists as the note `color`.
const COLORS = [
  'bg-yellow-200',
  'bg-pink-200',
  'bg-blue-200',
  'bg-green-200',
  'bg-purple-200',
  'bg-orange-200',
];

const DEBOUNCE_MS = 500;

// Electron app-region styles. Only the header bar is the OS drag handle;
// every interactive control inside it must opt out with 'no-drag' or the
// OS swallows the clicks — exactly the "close/add unclickable" bug.
const DRAG_REGION = { WebkitAppRegion: 'drag' } as any;
const NO_DRAG_REGION = { WebkitAppRegion: 'no-drag' } as any;

// Minimal ambient typing so this file compiles even when run outside Electron.
declare global {
  interface Window {
    api?: {
      createNote: (x?: number | null, y?: number | null) => void;
      updateNote: (id: string, payload: { text?: string; color?: string }) => void;
      deleteNote: (id: string) => void;
      deleteAllNotes: () => void;
    };
  }
}

export default function App() {
  const [noteId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('noteId')?.trim() ?? '';
  });

  const [text, setText] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const savedText = params.get('text');
    return savedText ? decodeURIComponent(savedText) : '';
  });

  const [color, setColor] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const savedColor = params.get('color');
    return savedColor ? decodeURIComponent(savedColor) : COLORS[0];
  });
  


  const [isEditingColor, setIsEditingColor] = useState(false);

  // Ref used by the debouncer to cancel a pending save on the next change.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  // Persist whenever the note's content changes — debounced by 500ms so rapid
  // typing only writes once the user pauses.
  useEffect(() => {
    if (!noteId) return;

    flushPendingSave();
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      window.api?.updateNote(noteId, { text, color });
    }, DEBOUNCE_MS);

    return flushPendingSave;
  }, [text, color, noteId, flushPendingSave]);

  // Spawn a brand-new sticky note window via the main process.
  const handleCreateNote = () => {
    window.api?.createNote(null, null);
  };

  // Request the main process to delete this note and close its window.
  const handleDeleteNote = () => {
    // noteId is always a non-empty string for windows opened by the main
    // process (it injects ?noteId=). Guard anyway so we never send null or
    // undefined across the IPC bridge.
    if (!noteId) {
      console.warn('deleteNote aborted: no valid noteId in the URL.');
      return;
    }
    window.api?.deleteNote(noteId);
  };

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden rounded-2xl border border-black/5 shadow-xl select-none ${color}`}
    >
      {/* Header / Drag handle — allows moving the whole Electron window */}
      <div
        className="flex items-center justify-between gap-2 bg-black/5 px-3 py-2.5 shrink-0"
        style={DRAG_REGION}
      >
        <div className="flex items-center gap-2">
          {/* Color picker toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingColor((v) => !v);
              }}
              title="Change color"
              className="p-1.5 hover:bg-black/10 rounded-md text-black/40 hover:text-black/70 transition-colors"
              style={NO_DRAG_REGION}
            >
              <Palette size={16} />
            </button>

            {isEditingColor && (
              <div
                className="absolute top-full left-0 mt-2 flex gap-1.5 bg-white rounded-xl px-2 py-2 shadow-xl border border-black/10"
                style={NO_DRAG_REGION}
              >
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setColor(c);
                      setIsEditingColor(false);
                    }}
                    title={c}
                    className={`size-6 rounded-full ${c} border border-black/10 hover:scale-110 transition-transform`}
                    style={NO_DRAG_REGION}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Close All: closes every open note window and clears storage */}
          <button
            type="button"
            onClick={() => window.api?.deleteAllNotes()}
            title="Close all notes"
            className="p-1.5 hover:bg-black/10 rounded-md text-black/40 hover:text-red-600 transition-colors"
            style={NO_DRAG_REGION}
          >
            <ListX size={16} />
          </button>

          {/* Close: deletes this note via IPC */}
          <button
            type="button"
            onClick={handleDeleteNote}
            title="Delete note"
            className="p-1.5 hover:bg-red-200/70 rounded-md text-black/40 hover:text-red-600 transition-colors"
            style={NO_DRAG_REGION}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Note body */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write something..."
        className="flex-1 w-full resize-none outline-none bg-transparent p-4 text-stone-800 placeholder:text-stone-800/40 font-medium leading-relaxed"
        style={NO_DRAG_REGION}
      />

      {/* New-note action (also no-drag so it stays clickable) */}
      <button
        type="button"
        onClick={handleCreateNote}
        title="New note"
        className="flex items-center justify-center gap-2 shrink-0 border-t-[6px] border-black/5 bg-black/5 py-2 text-black/50 hover:text-black hover:bg-black/10 transition-colors font-medium text-sm"
        style={NO_DRAG_REGION}
      >
        <Plus size={16} />
        New Note
      </button>
    </div>
  );
}
