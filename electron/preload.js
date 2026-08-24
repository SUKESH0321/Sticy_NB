import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods to the Renderer process via contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  // Note creation
  createNote: () => ipcRenderer.invoke('create-note'),

  // Note updates
  updateNote: (id, updates) => ipcRenderer.invoke('update-note', id, updates),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),

  // Window positioning
  updateNotePosition: (id, x, y) => ipcRenderer.invoke('update-position', id, x, y),
  updateNoteSize: (id, w, h) => ipcRenderer.invoke('update-size', id, w, h),

  // Focus management
  focusNote: (id) => ipcRenderer.invoke('focus-note', id),
});