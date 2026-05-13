import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import cors from 'cors';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  const userDataPath = path.join(process.cwd(), 'userData');
  const uploadsPath = path.join(process.cwd(), 'uploads');
  const configFile = path.join(userDataPath, 'config.json');

  if (!fs.existsSync(userDataPath)) fs.mkdirSync(userDataPath);
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath);

  // Default config
  const defaultConfig = {
    assets: [
      { id: 'idle1', name: '常规1', url: '/gif/常规1.gif', type: 'image' },
      { id: 'idle2', name: '常规2', url: '/gif/常规2.gif', type: 'image' },
      { id: 'eat1', name: '吃饭1', url: '/gif/吃饭1.gif', type: 'image' },
      { id: 'eat2', name: '吃饭2', url: '/gif/吃饭2.gif', type: 'image' },
      { id: 'daze1', name: '发呆1', url: '/gif/发呆1.gif', type: 'image' },
      { id: 'daze2', name: '发呆2', url: '/gif/发呆2.gif', type: 'image' },
      { id: 'sleep1', name: '睡觉', url: '/gif/睡觉.gif', type: 'image' },
      { id: 'exercise1', name: '做操', url: '/gif/做操.gif', type: 'image' },
    ],
    currentAssetId: 'idle1',
    buttons: [
      { id: 'eat', emoji: '🍜', name: '吃饭', response: '猫猫吃得真香~', mode: 'action', assetIds: ['eat1', 'eat2'], duration: 8 },
      { id: 'daze', emoji: '😶', name: '发呆', response: '猫猫正在思考猫生...', mode: 'action', assetIds: ['daze1', 'daze2'], duration: 8 },
      { id: 'sleep', emoji: '😴', name: '睡觉', response: '嘘，猫猫睡着了。', mode: 'action', assetIds: ['sleep1'], duration: 8 },
      { id: 'exercise', emoji: '🤸', name: '做操', response: '猫猫正在努力锻炼！', mode: 'action', assetIds: ['exercise1'], duration: 8 },
      { id: 'sing', emoji: '🎤', name: '唱歌', response: '猫猫开始大灌篮了... 哦不，是大展歌喉！', mode: 'action', assetIds: [], audioIds: [], duration: 0 },
      { id: 'pomodoro', emoji: '⏱️', name: '小猫监工', response: '', mode: 'text', assetIds: [], duration: 0 },
    ],
    idleMessages: ['喵~ 肚子饿了', '该铲屎了', '今天天气不错', '想睡觉了...', '要记得多喝水哦', '工作辛苦啦'],
    appearance: {
      size: 260
    }
  };

  // Helper to detect if we should force update old configs (versioning)
  const CONFIG_VERSION = 8;
  const configVersionFile = path.join(userDataPath, 'version.json');
  
  if (fs.existsSync(configFile)) {
    // Check version
    let currentVersion = 1;
    if (fs.existsSync(configVersionFile)) {
      currentVersion = JSON.parse(fs.readFileSync(configVersionFile, 'utf-8')).version;
    }

    if (currentVersion < CONFIG_VERSION) {
      console.log(`Detected old config version (${currentVersion}), updating to ${CONFIG_VERSION}...`);
      const existingConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      
      // Force update assets and buttons if coming from old versions
      if (currentVersion < 7) { 
        existingConfig.assets = defaultConfig.assets;
        
        // Ensure buttons have audioIds
        existingConfig.buttons = existingConfig.buttons.map((b: any) => ({
          ...b,
          audioIds: b.audioIds || []
        }));

        // Add sing if missing
        const hasSing = existingConfig.buttons.some((b: any) => b.id === 'sing');
        if (!hasSing) {
          existingConfig.buttons.splice(4, 0, defaultConfig.buttons[4]);
        } else {
          // Update sing duration to 0 for infinite
          existingConfig.buttons = existingConfig.buttons.map((b: any) => 
            b.id === 'sing' ? { ...b, duration: 0 } : b
          );
        }
      }

      fs.writeFileSync(configFile, JSON.stringify(existingConfig, null, 2));
      fs.writeFileSync(configVersionFile, JSON.stringify({ version: CONFIG_VERSION }));
    }
  }

  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
    fs.writeFileSync(configVersionFile, JSON.stringify({ version: CONFIG_VERSION }));
  }

  // --- API Routes ---

  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // Get config
  app.get('/api/config', (req, res) => {
    try {
      if (!fs.existsSync(configFile)) {
        return res.json(defaultConfig);
      }
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      res.json(config);
    } catch (err) {
      console.error('Error reading config:', err);
      res.status(500).json({ error: 'Failed to read config' });
    }
  });

  // Save config
  app.post('/api/config', (req, res) => {
    try {
      fs.writeFileSync(configFile, JSON.stringify(req.body, null, 2));
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving config:', err);
      res.status(500).json({ error: 'Failed to save config' });
    }
  });

  // File upload
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  });
  const upload = multer({ 
    storage,
    limits: { fileSize: 150 * 1024 * 1024 } // Increase to 150MB for videos
  });

  app.post('/api/upload', (req: any, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err instanceof (multer as any).MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: '文件太大，请尝试上传 150MB 以内的文件' });
        }
        return res.status(400).json({ error: `上传错误: ${err.message}` });
      } else if (err) {
        return res.status(500).json({ error: '服务器内部错误，上传失败' });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: '未选择文件' });
      }

      console.log('File uploaded successfully:', req.file.filename);
      res.json({ url: `/uploads/${req.file.filename}` });
    });
  });

  // API 404 handler
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Global error handler for API
  app.use((err: any, req: any, res: any, next: any) => {
    if (req.url.startsWith('/api')) {
      console.error('API Error:', err);
      return res.status(err.status || 500).json({ 
        error: err.message || 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    }
    next(err);
  });

  // Static uploads
  app.use('/gif', express.static(path.join(process.cwd(), 'gif')));
  app.use('/uploads', express.static(uploadsPath));

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
