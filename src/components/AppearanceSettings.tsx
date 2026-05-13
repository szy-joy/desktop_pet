import { ChangeEvent } from 'react';
import { AppConfig } from '../types';

interface AppearanceSettingsProps {
  config: AppConfig;
  onUpdate: (config: AppConfig) => void;
}

export default function AppearanceSettings({ config, onUpdate }: AppearanceSettingsProps) {
  const handleSizeChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      ...config,
      appearance: {
        ...config.appearance,
        size: parseInt(e.target.value)
      }
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-800">显示</h3>
        <p className="text-xs text-gray-500">调整大郎在桌面上的显示尺寸</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700">显示大小</label>
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold ring-1 ring-blue-100">
              {config.appearance.size}px
            </span>
          </div>
          
          <div className="relative flex items-center group">
            <input 
              type="range" 
              min="120" 
              max="400" 
              step="10"
              value={config.appearance.size}
              onChange={handleSizeChange}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-slate-300 transition-all font-medium text-sm"
            />
          </div>
          
          <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1 uppercase tracking-tight">
            <span>迷你 (120px)</span>
            <span>适配 (260px)</span>
            <span>巨大 (400px)</span>
          </div>
        </div>

        <div className="p-4 bg-slate-100 rounded-lg border border-slate-200 space-y-2 font-medium">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
            💡 小贴士
          </h4>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            你可以直接拖动大郎到屏幕的任何位置。右键点击也会快速呼出这个控制面板。
          </p>
        </div>
      </div>

      {/* Preview Simulation */}
      <div className="p-6 border border-slate-200 rounded-xl flex flex-col items-center justify-center gap-4 bg-white">
        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400">尺寸预览</div>
        <div 
          className="bg-slate-50 shadow-inner rounded-xl border border-slate-100 flex items-center justify-center text-3xl overflow-hidden transition-all duration-300"
          style={{ width: config.appearance.size / 2, height: config.appearance.size / 2 }}
        >
          {config.assets.find(a => a.id === config.currentAssetId)?.type === 'video' ? '📺' : '🐱'}
        </div>
      </div>
    </div>
  );
}
