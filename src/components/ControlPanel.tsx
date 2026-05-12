import { useState } from 'react';
import { X, Images, MousePointer2, MessageSquare, Settings2 } from 'lucide-react';
import { AppConfig } from '../types';
import AssetManager from './AssetManager';
import InteractionSettings from './InteractionSettings';
import IdleMessages from './IdleMessages';
import AppearanceSettings from './AppearanceSettings';

interface ControlPanelProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  onClose: () => void;
}

type TabType = 'assets' | 'interactions' | 'idle' | 'appearance';

export default function ControlPanel({ config, onSave, onClose }: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('assets');

  const tabs = [
    { id: 'assets', label: '素材管理', icon: '📂' },
    { id: 'interactions', label: '交互按钮', icon: '⚡' },
    { id: 'idle', label: '闲置消息', icon: '💬' },
    { id: 'appearance', label: '外观设置', icon: '⚙️' },
  ];

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm z-[100] p-4"
      onMouseEnter={() => {
        if ((window as any).require) {
          try {
            const { ipcRenderer } = (window as any).require('electron');
            ipcRenderer.send('set-ignore-mouse-events', false, { forward: true });
          } catch (e) {}
        }
      }}
    >
      <div 
        className="bg-slate-50 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200"
        style={{ width: 680, height: 700 }}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-[180px] bg-slate-100 border-r border-slate-200 py-6 flex flex-col overflow-hidden">
            <div className="px-6 mb-8 text-left">
              <div className="text-blue-600 font-bold text-xl tracking-tight italic">NekoDesktop</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-widest leading-relaxed">v2.4.0 Stable</div>
            </div>

            <nav className="flex-1 overflow-y-auto">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`
                      w-full flex items-center gap-3 px-6 py-4 transition-all relative text-sm font-semibold
                      ${isActive 
                        ? 'bg-white text-blue-600 border-l-4 border-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
                    `}
                  >
                    <span className="text-lg leading-none">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-slate-200">
              <button 
                onClick={() => {
                  if (window.confirm('确定要退出猫猫吗？')) {
                    window.close();
                  }
                }}
                className="w-full flex items-center gap-3 px-6 py-4 text-sm font-semibold text-red-500 hover:bg-red-50 transition-all"
              >
                <span className="text-lg leading-none">🚪</span>
                <span>退出软件</span>
              </button>
              <div className="p-4 pt-1 text-[10px] text-slate-400">
                Connected to: cat-render-engine-v1
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {/* Top Toolbar */}
            <div className="px-8 py-4 border-b border-slate-200 flex items-center justify-end">
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8">
              {activeTab === 'assets' && <AssetManager config={config} onUpdate={onSave} />}
              {activeTab === 'interactions' && <InteractionSettings config={config} onUpdate={onSave} />}
              {activeTab === 'idle' && <IdleMessages config={config} onUpdate={onSave} />}
              {activeTab === 'appearance' && <AppearanceSettings config={config} onUpdate={onSave} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
