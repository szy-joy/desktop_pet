const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  // 如果是开发环境，服务器已经由 npm run dev 启动了，我们不需要再启动
  if (!app.isPackaged) {
    console.log('Running in development mode, skipping internal server start.');
    return;
  }

  // 生产环境下启动服务器
  const serverPath = path.join(__dirname, 'server.ts');
  console.log(`Starting production server at: ${serverPath}`);
  
  serverProcess = spawn('npx', ['tsx', serverPath], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000' },
    shell: true
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // 处理鼠标穿透逻辑
  const { ipcMain } = require('electron');
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  mainWindow.loadURL('http://localhost:3000');

  // 默认开启鼠标穿透（因为全屏透明窗口会挡住桌面）
  mainWindow.setIgnoreMouseEvents(true, { forward: true });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  // 开发模式下延迟小一点
  const delay = app.isPackaged ? 2000 : 500;
  setTimeout(createWindow, delay);

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});
