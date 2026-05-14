import { useState, ChangeEvent, DragEvent, useEffect } from 'react';
import { Upload, Trash2, FileVideo, FileImage, Music, FileAudio } from 'lucide-react';
import { AppConfig, Asset } from '../types';

interface AssetManagerProps {
  config: AppConfig;
  onUpdate: (config: AppConfig) => void;
}

export default function AssetManager({ config, onUpdate }: AssetManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  // Prevent default browser behavior for drag and drop globally
  useEffect(() => {
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      // Only stop propagation if we are dragging over the window but NOT our drop zone
      // to allow the drop zone to still handle its own events
    };
    
    window.addEventListener('dragover', preventDefault as any);
    window.addEventListener('drop', preventDefault as any);
    
    return () => {
      window.removeEventListener('dragover', preventDefault as any);
      window.removeEventListener('drop', preventDefault as any);
    };
  }, []);

  // Helper to upload a single file with progress
  const uploadFile = async (file: File): Promise<Asset> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      // Track progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: percent }));
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try {
              const data = JSON.parse(xhr.responseText);
              const type = file.type.startsWith('video') ? 'video' : 
                           file.type.startsWith('audio') ? 'audio' : 'image';
              
              resolve({
                id: (Date.now() + Math.random()).toString(),
                name: file.name,
                url: data.url,
                type: type
              });
            } catch (e) {
              reject(new Error('服务器解析错误'));
            }
          } else {
            reject(new Error(`上传失败 (${xhr.status})`));
          }
        }
      };

      xhr.open('POST', '/api/upload', true);
      xhr.send(formData);
    });
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;
    
    // Limit to 5 files as requested
    const filesToUpload = files.slice(0, 5);
    if (files.length > 5) {
      alert('单次最多允许上传 5 个素材，已为您自动选择前 5 个');
    }

    setUploading(true);
    setUploadProgress({}); // Reset progress
    try {
      const uploadPromises = filesToUpload.map(file => uploadFile(file));
      const newAssets = await Promise.all(uploadPromises);

      onUpdate({
        ...config,
        assets: [...config.assets, ...newAssets]
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err.message || '部分或全部素材上传失败，请重试');
    } finally {
      setUploading(false);
      setUploadProgress({}); // Clear after finish
    }
  };

  const handleUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
    // Reset input
    e.target.value = '';
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (uploading) return;

    const files = Array.from(e.dataTransfer.files || []) as File[];
    
    // Filter out directories (directories usually have no type and size 0 or are filtered by browser)
    const validFiles = files.filter(f => 
      f.type.startsWith('image/') || 
      f.type.startsWith('video/') || 
      f.type.startsWith('audio/')
    );

    processFiles(validFiles);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const deleteAsset = (id: string) => {
    const newAssets = config.assets.filter(a => a.id !== id);
    let newCurrent = config.currentAssetId;
    
    if (config.currentAssetId === id) {
      newCurrent = newAssets.length > 0 ? newAssets[0].id : '';
    }
    
    const newButtons = config.buttons.map(b => ({
      ...b,
      assetIds: b.assetIds?.filter(aid => aid !== id) || []
    }));
    
    onUpdate({ ...config, assets: newAssets, currentAssetId: newCurrent, buttons: newButtons });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">素材库</h3>
          <p className="text-xs text-gray-500">上传 WebP, GIF, MP4, MP3 等 (单次最多5个)</p>
        </div>
      </div>

      {/* Upload Zone */}
      <div 
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8 transition-all flex flex-col items-center justify-center gap-3
          ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-200 bg-slate-50/50'}
          ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:border-blue-400 hover:bg-slate-50'}
        `}
      >
        <div className={`p-4 rounded-full ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400'} shadow-sm transition-colors`}>
          <Upload size={32} />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-slate-700">
            {uploading ? '正在处理素材...' : '点击或拖拽文件到此处'}
          </p>
          <p className="text-xs text-slate-400 mt-1">支持多选，单次最多 5 个</p>
        </div>

        {/* Progress Display */}
        {uploading && Object.keys(uploadProgress).length > 0 && (
          <div className="absolute inset-x-0 bottom-0 p-4 bg-white/80 backdrop-blur-sm border-t border-blue-100 animate-in slide-in-from-bottom-2 duration-300">
            <div className="max-w-xs mx-auto space-y-2">
              {Object.entries(uploadProgress).map(([name, progress]) => (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-slate-600 truncate max-w-[150px]">{name}</span>
                    <span className="text-blue-600">{progress}%</span>
                  </div>
                  <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-300 ease-out" 
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <input 
          type="file" 
          className="absolute inset-0 opacity-0 cursor-pointer" 
          onChange={handleUpload} 
          disabled={uploading} 
          multiple
          accept="image/*,video/*,audio/*" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {config.assets.map(asset => {
          const isActive = config.currentAssetId === asset.id;
          const isAudio = asset.type === 'audio';

          return (
            <div 
              key={asset.id}
              className={`
                group relative border rounded-lg overflow-hidden transition-all h-36 flex flex-col bg-white
                ${isActive ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}
              `}
            >
              <div 
                className="flex-1 overflow-hidden cursor-pointer"
                onClick={() => asset.type !== 'audio' && onUpdate({ ...config, currentAssetId: asset.id })}
              >
                {asset.type === 'video' ? (
                  <video src={asset.url} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" loop muted />
                ) : asset.type === 'audio' ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 gap-2">
                    <Music size={48} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                    <audio src={asset.url} controls className="w-[80%] h-6 scale-75 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                )}
              </div>

              <div className="px-3 py-2 flex items-center justify-between border-t border-slate-100 bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  {asset.type === 'video' ? <FileVideo size={14} className="text-slate-400 shrink-0" /> : 
                   asset.type === 'audio' ? <FileAudio size={14} className="text-slate-400 shrink-0" /> :
                   <FileImage size={14} className="text-slate-400 shrink-0" />}
                  <span className="text-xs truncate font-semibold text-slate-700">{asset.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isActive ? (
                    <span className="text-blue-500 text-[10px] font-bold uppercase">Active</span>
                  ) : (
                    <div className="flex gap-1">
                        {!isAudio && (
                          <button 
                              onClick={() => onUpdate({ ...config, currentAssetId: asset.id })}
                              className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded"
                          >
                              ★
                          </button>
                        )}
                        <button 
                            onClick={() => deleteAsset(asset.id)}
                            className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"
                            >
                            <Trash2 size={14} />
                        </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
