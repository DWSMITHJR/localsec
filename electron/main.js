// electron/main.js
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Security and configuration
const isDev = process.env.NODE_ENV === 'development';
const isWindows = process.platform === 'win32';

// Application configuration
const APP_CONFIG = {
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        preload: path.join(__dirname, 'preload.js')
    }
};

// Main window reference
let mainWindow;

// Create main window
function createMainWindow() {
    mainWindow = new BrowserWindow({
        ...APP_CONFIG,
        icon: path.join(__dirname, '../assets/icon.png'),
        title: 'Local Security Vault',
        show: false, // Don't show until ready
        autoHideMenuBar: false,
        titleBarStyle: 'default'
    });

    // Load the app
    const startUrl = isDev
        ? 'http://localhost:8000'
        : `file://${path.join(__dirname, '../dist/index.html')}`;

    mainWindow.loadURL(startUrl);

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();

        // Focus on window creation
        if (isWindows) mainWindow.focus();
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Security: Prevent new window creation
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Development: Open DevTools
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

// App event listeners
app.whenReady().then(() => {
    createMainWindow();

    // Set up application menu
    setupApplicationMenu();

    // Handle app activation (macOS)
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
});

// Window management
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Handle app security
app.on('browser-window-created', (event, window) => {
    window.webContents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
});

// Setup application menu
function setupApplicationMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Window',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        createMainWindow();
                    }
                },
                { type: 'separator' },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/localsec-vault');
                    }
                },
                {
                    label: 'Report Issue',
                    click: () => {
                        shell.openExternal('https://github.com/your-repo/localsec-vault/issues');
                    }
                },
                { type: 'separator' },
                {
                    label: 'About Local Security Vault',
                    click: () => {
                        const aboutWindow = new BrowserWindow({
                            width: 400,
                            height: 300,
                            resizable: false,
                            minimizable: false,
                            maximizable: false,
                            modal: true,
                            parent: mainWindow,
                            title: 'About'
                        });

                        aboutWindow.loadURL(`data:text/html,
                            <html>
                                <head><title>About Local Security Vault</title></head>
                                <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; text-align: center;">
                                    <h2>🔐 Local Security Vault</h2>
                                    <p><strong>Version:</strong> ${app.getVersion()}</p>
                                    <p><strong>Platform:</strong> ${process.platform}</p>
                                    <p><strong>Electron:</strong> ${process.versions.electron}</p>
                                    <p><strong>Node:</strong> ${process.versions.node}</p>
                                    <p><strong>Chrome:</strong> ${process.versions.chrome}</p>
                                    <p style="margin-top: 20px; font-size: 14px; color: #666;">
                                        Secure offline password and credential management
                                    </p>
                                </body>
                            </html>
                        `);
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// Handle IPC messages from renderer
ipcMain.handle('get-app-info', () => {
    return {
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        electron: process.versions.electron,
        node: process.versions.node,
        chrome: process.versions.chrome
    };
});

// Handle secure file operations
ipcMain.handle('save-file', async (event, filePath, data) => {
    try {
        fs.writeFileSync(filePath, data);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-file', async (event, filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// Security: Disable navigation to external URLs in production
if (!isDev) {
    app.on('web-contents-created', (event, contents) => {
        contents.on('will-navigate', (event, navigationUrl) => {
            const parsedUrl = new URL(navigationUrl);
            if (parsedUrl.origin !== 'file://') {
                event.preventDefault();
            }
        });
    });
}

// Handle app crashes and errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // In production, you might want to restart the app or log to a file
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Export for testing
module.exports = { createMainWindow };
