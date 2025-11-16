// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // Get application information
    getAppInfo: () => ipcRenderer.invoke('get-app-info'),

    // Secure file operations
    saveFile: (filePath, data) => ipcRenderer.invoke('save-file', filePath, data),
    loadFile: (filePath) => ipcRenderer.invoke('load-file', filePath),

    // Platform detection
    platform: process.platform,
    isDev: process.env.NODE_ENV === 'development',

    // Version information
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    }
});

// Note: In production, the renderer process should not have access to Node.js APIs
// This preload script provides a secure bridge for necessary functionality only
