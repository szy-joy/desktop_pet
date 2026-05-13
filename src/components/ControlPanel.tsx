import { useState, useEffect } from 'react';
import { X, Images, MousePointer2, MessageSquare, Settings2 } from 'lucide-react';
import { motion } from 'motion/react';
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
    { id: 'assets', label: '素材库', icon: '📁' },
    { id: 'interactions', label: '交互功能', icon: '👾' },
    { id: 'idle', label: '互动台词', icon: '💬' },
    { id: 'appearance', label: '显示', icon: '📺' },
  ];

  // 控制 Electron 鼠标穿透
  const updateMouseIgnore = (ignore: boolean) => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('set-ignore-mouse-events', ignore, { forward: true });
      } catch (e) { /* ignore */ }
    }
  };

  // Initialize mouse pass-through on mount
  useEffect(() => {
    updateMouseIgnore(true);
    // Restore on unmount
    return () => updateMouseIgnore(true);
  }, []);

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[100] p-4 pointer-events-none"
    >
      {/* Semi-transparent backdrop that doesn't block OS windows */}
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />
      
      <motion.div 
        drag
        dragMomentum={false}
        className="bg-slate-50 rounded-xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 pointer-events-auto relative"
        style={{ width: 580, height: 600 }}
        onMouseEnter={() => updateMouseIgnore(false)}
        onMouseLeave={() => updateMouseIgnore(true)}
      >
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-[140px] bg-slate-100 border-r border-slate-200 py-6 flex flex-col overflow-hidden">
            <div 
              className="px-4 mb-6 text-left shrink-0 select-none cursor-default"
            >
              <div className="text-blue-600 font-bold text-lg tracking-tight italic">专属巨星</div>
              <div className="text-[9px] text-slate-400 uppercase tracking-widest">v2.4.0</div>
            </div>

            <nav className="flex-1 overflow-y-auto">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3.5 transition-all relative text-sm font-bold
                      ${isActive 
                        ? 'bg-white text-blue-600 border-l-4 border-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:bg-slate-200 hover:text-slate-700'}
                    `}
                  >
                    <span className="text-base leading-none grayscale-[0.5] shrink-0">{tab.icon}</span>
                    <span className="whitespace-nowrap">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-slate-200">
              <button 
                onClick={() => {
                  if (window.confirm('确定要跟小猫拜拜吗？')) {
                    window.close();
                  }
                }}
                className="w-full flex items-center gap-3 px-4 py-4 text-sm font-bold text-red-500 hover:bg-red-50 transition-all font-mono"
              >
                <span className="text-base grayscale">🔴</span>
                <span>关闭应用</span>
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
      </motion.div>
    </div>
  );
}
