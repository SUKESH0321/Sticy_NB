const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  createNote: (x, y) => ipcRenderer.send('note:create', x, y),
  updateNote: (id, payload) => ipcRenderer.send('note:update', id, payload),
  deleteNote: (id) => ipcRenderer.send('note:delete', id),
  deleteAllNotes: () => ipcRenderer.send('note:deleteAll'),
  onAutoColor: (callback) => ipcRenderer.on('note:auto-color', (_event, color) => callback(color)),
  onAutoTag: (callback) => ipcRenderer.on('note:auto-tag', (_event, tag) => callback(tag)),
  onReminderSet: (callback) => ipcRenderer.on('note:reminder-set', (_event, dateStr) => callback(dateStr))
});