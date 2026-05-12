import { useState, ChangeEvent } from 'react';
import { Upload, Trash2, CheckCircle2, FileVideo, FileImage, Plus } from 'lucide-react';
import { AppConfig, Asset } from '../types';

interface AssetManagerProps {
  config: AppConfig;
  onUpdate: (config: AppConfig) => void;
}

export default function AssetManager({ config, onUpdate }: AssetManagerProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown server error' }));
        throw new Error(errorData.error || `Upload failed with status ${res.status}`);
      }

      let data: any;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Non-JSON response received:', text);
        throw new Error(`Server returned non-JSON response (${res.status})`);
      }

      const newAsset: Asset = {
        id: Date.now().toString(),
        name: file.name,
        url: data.url,
        type: file.type.startsWith('video') ? 'video' : 'image'
      };

      onUpdate({
        ...config,
        assets: [...config.assets, newAsset]
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      alert(err.message || '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const deleteAsset = (id: string) => {
    const newAssets = config.assets.filter(a => a.id !== id);
    let newCurrent = config.currentAssetId;
    
    if (config.currentAssetId === id) {
      newCurrent = newAssets.length > 0 ? newAssets[0].id : '';
    }
    
    onUpdate({ ...config, assets: newAssets, currentAssetId: newCurrent });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">素材库</h3>
          <p className="text-xs text-gray-500">上传 WebP, GIF, MP4 等素材</p>
        </div>
        <label className={`
          flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-all font-medium text-sm
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          <Upload size={16} />
          {uploading ? '正在上传...' : '上传素材'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept="image/*,video/*" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {config.assets.map(asset => {
          const isActive = config.currentAssetId === asset.id;
          return (
            <div 
              key={asset.id}
              className={`
                group relative border rounded-lg overflow-hidden transition-all h-36 flex flex-col bg-white
                ${isActive ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}
              `}
            >
              {/* Preview */}
              <div 
                className="flex-1 overflow-hidden cursor-pointer"
                onClick={() => onUpdate({ ...config, currentAssetId: asset.id })}
              >
                {asset.type === 'video' ? (
                  <video src={asset.url} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" loop muted />
                ) : (
                  <img src={asset.url} alt={asset.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110" referrerPolicy="no-referrer" />
                )}
              </div>

              {/* Info Bar */}
              <div className="px-3 py-2 flex items-center justify-between border-t border-slate-100 bg-white">
                <div className="flex items-center gap-2 min-w-0">
                  {asset.type === 'video' ? <FileVideo size={14} className="text-slate-400 shrink-0" /> : <FileImage size={14} className="text-slate-400 shrink-0" />}
                  <span className="text-xs truncate font-semibold text-slate-700">{asset.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isActive ? (
                    <span className="text-blue-500 text-[10px] font-bold uppercase">Active</span>
                  ) : (
                    <div className="flex gap-1">
                        <button 
                            onClick={() => onUpdate({ ...config, currentAssetId: asset.id })}
                            className="p-1 hover:bg-blue-50 text-slate-400 hover:text-blue-500 rounded"
                        >
                            ★
                        </button>
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
