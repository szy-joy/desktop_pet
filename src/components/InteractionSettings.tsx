import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, FileVideo, FileImage } from 'lucide-react';
import { AppConfig, InteractionButton } from '../types';

interface InteractionSettingsProps {
  config: AppConfig;
  onUpdate: (config: AppConfig) => void;
}

export default function InteractionSettings({ config, onUpdate }: InteractionSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InteractionButton>>({});

  const startEdit = (btn: InteractionButton) => {
    setFormData(btn);
    setEditingId(btn.id);
  };

  const startAdd = () => {
    const newBtn: Partial<InteractionButton> = {
      id: Date.now().toString(),
      emoji: '✨',
      name: '新交互',
      response: '你好呀！',
      mode: 'text',
      actionAsset: '',
      duration: 2
    };
    setFormData(newBtn);
    setEditingId(newBtn.id);
  };

  const saveEdit = () => {
    if (!formData.id) return;
    const exists = config.buttons.find(b => b.id === formData.id);
    let newButtons;
    if (exists) {
      newButtons = config.buttons.map(b => b.id === formData.id ? { ...b, ...formData } as InteractionButton : b);
    } else {
      newButtons = [...config.buttons, formData as InteractionButton];
    }
    onUpdate({ ...config, buttons: newButtons });
    setEditingId(null);
  };

  const deleteButton = (id: string) => {
    onUpdate({ ...config, buttons: config.buttons.filter(b => b.id !== id) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">交互按钮</h3>
          <p className="text-xs text-gray-500">配置猫猫右侧显示的交互菜单</p>
        </div>
        <button 
          onClick={startAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm"
        >
          <Plus size={16} />
          添加按钮
        </button>
      </div>

      <div className="space-y-3">
        {/* Render New Button Form if adding */}
        {editingId && !config.buttons.find(b => b.id === editingId) && (
          <div className="p-5 border border-blue-500 rounded-xl bg-blue-50/10 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">图标</label>
                <input 
                  type="text" 
                  value={formData.emoji} 
                  onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">名称</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-400">回应文案</label>
              <input 
                type="text" 
                value={formData.response} 
                onChange={e => setFormData({ ...formData, response: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400">模式</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setFormData({ ...formData, mode: 'text' })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${formData.mode === 'text' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                >
                  纯语言
                </button>
                <button 
                  onClick={() => setFormData({ ...formData, mode: 'action' })}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${formData.mode === 'action' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                >
                  动作素材
                </button>
              </div>
            </div>

            {formData.mode === 'action' && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">选择素材</label>
                  <select 
                    value={formData.actionAsset}
                    onChange={e => setFormData({ ...formData, actionAsset: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    <option value="">请选择...</option>
                    {config.assets.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">持续时间 (秒)</label>
                  <input 
                    type="number" 
                    value={formData.duration} 
                    onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                <X size={20} />
              </button>
              <button onClick={saveEdit} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl">
                <Check size={20} />
              </button>
            </div>
          </div>
        )}

        {config.buttons.map(btn => {
          const isEditing = editingId === btn.id;

          if (isEditing) {
            return (
              <div key={btn.id} className="p-5 border border-blue-500 rounded-xl bg-blue-50/10 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">图标</label>
                    <input 
                      type="text" 
                      value={formData.emoji} 
                      onChange={e => setFormData({ ...formData, emoji: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-center text-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">名称</label>
                    <input 
                      type="text" 
                      value={formData.name} 
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">回应文案</label>
                  <input 
                    type="text" 
                    value={formData.response} 
                    onChange={e => setFormData({ ...formData, response: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold text-slate-400">模式</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setFormData({ ...formData, mode: 'text' })}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${formData.mode === 'text' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                    >
                      纯语言
                    </button>
                    <button 
                      onClick={() => setFormData({ ...formData, mode: 'action' })}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${formData.mode === 'action' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white text-slate-500 hover:bg-slate-50 border-slate-200'}`}
                    >
                      动作素材
                    </button>
                  </div>
                </div>

                {formData.mode === 'action' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">选择素材</label>
                      <select 
                        value={formData.actionAsset}
                        onChange={e => setFormData({ ...formData, actionAsset: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                      >
                        <option value="">请选择...</option>
                        {config.assets.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400">持续时间 (秒)</label>
                      <input 
                        type="number" 
                        value={formData.duration} 
                        onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl">
                    <X size={20} />
                  </button>
                  <button onClick={saveEdit} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl">
                    <Check size={20} />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={btn.id} className="group p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between hover:border-slate-300 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-slate-50 rounded-lg text-2xl group-hover:bg-blue-50 group-hover:scale-105 transition-all">
                  {btn.emoji}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{btn.name}</h4>
                  <p className="text-xs text-slate-400 truncate max-w-[200px] font-medium">{btn.response}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button onClick={() => startEdit(btn)} className="p-2 hover:bg-blue-50 text-blue-500 rounded-lg">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => deleteButton(btn.id)} className="p-2 hover:bg-red-50 text-red-400 rounded-lg">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
