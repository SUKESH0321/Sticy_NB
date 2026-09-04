const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  createNote: (x, y) => ipcRenderer.send('note:create', x, y),
  updateNote: (id, payload) => ipcRenderer.send('note:update', id, payload),
  deleteNote: (id) => ipcRenderer.send('note:delete', id),
  deleteAllNotes: () => ipcRenderer.send('note:deleteAll')
});