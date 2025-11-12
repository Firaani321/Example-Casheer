
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  read: () => ipcRenderer.invoke('read-db'),
  write: (data) => ipcRenderer.invoke('write-db', data),
});
