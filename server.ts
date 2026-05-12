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
      { id: 'default', name: '猫猫沙发', url: 'https://www.cdc.gov/healthy-pets/media/images/2024/04/Cat-on-couch.jpg', type: 'image' }
    ],
    currentAssetId: 'default',
    buttons: [
      { id: 'pet', emoji: '👋', name: '摸摸', response: '猫猫发出了呼噜声~', mode: 'text', actionAsset: '', duration: 2 },
      { id: 'tease', emoji: '🎾', name: '逗它', response: '猫猫兴奋地扑了过来！', mode: 'text', actionAsset: '', duration: 2 }
    ],
    idleMessages: ['喵~ 肚子饿了', '该铲屎了', '今天天气不错', '想睡觉了...'],
    appearance: {
      size: 260
    }
  };

  if (!fs.existsSync(configFile)) {
    fs.writeFileSync(configFile, JSON.stringify(defaultConfig, null, 2));
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
