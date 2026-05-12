const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  // 启动我们的 Express 服务器
  // 在开发环境下使用 tsx，打包后使用 node
  const serverPath = path.join(__dirname, 'server.ts');
  
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
    resizable: false, // 全屏模式下不需要缩放
    hasShadow: false,
    skipTaskbar: true, // 可选：不在任务栏显示
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // 处理鼠标穿透逻辑
  // 当渲染进程发送指令时，控制窗口是否忽略鼠标事件
  const { ipcMain } = require('electron');
  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    mainWindow.setIgnoreMouseEvents(ignore, options);
  });

  mainWindow.loadURL('http://localhost:3000');

  // 允许窗口在所有工作区显示 (macOS)
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startServer();
  // 给服务器一点启动时间
  setTimeout(createWindow, 2000);

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
