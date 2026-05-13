import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, FileVideo, FileImage, Music } from 'lucide-react';
import { AppConfig, InteractionButton } from '../types';

interface InteractionSettingsProps {
  config: AppConfig;
  onUpdate: (config: AppConfig) => void;
}

export default function InteractionSettings({ config, onUpdate }: InteractionSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<InteractionButton>>({});

  const [isSelecting, setIsSelecting] = useState(false);

  const [isSelectingAudio, setIsSelectingAudio] = useState(false);

  const startEdit = (btn: InteractionButton) => {
    setFormData({
      ...btn,
      audioIds: btn.audioIds || []
    });
    setEditingId(btn.id);
    setIsSelecting(false);
    setIsSelectingAudio(false);
  };

  const saveEdit = () => {
    if (!formData.id) return;
    const newButtons = config.buttons.map(b => 
      b.id === formData.id ? { ...b, ...formData } as InteractionButton : b
    );
    onUpdate({ ...config, buttons: newButtons });
    setEditingId(null);
    setIsSelecting(false);
    setIsSelectingAudio(false);
  };

  const addAssetToButton = (assetId: string) => {
    const asset = config.assets.find(a => a.id === assetId);
    if (!asset) return;

    if (asset.type === 'audio') {
      const currentAudioIds = formData.audioIds || [];
      if (currentAudioIds.includes(assetId)) return;
      setFormData({ ...formData, audioIds: [...currentAudioIds, assetId] });
    } else {
      const currentAssetIds = formData.assetIds || [];
      if (currentAssetIds.length >= 3) {
        alert('动图限制最多 3 个');
        return;
      }
      if (currentAssetIds.includes(assetId)) return;
      setFormData({ ...formData, assetIds: [...currentAssetIds, assetId] });
    }
  };

  const removeAssetFromButton = (assetId: string) => {
    const asset = config.assets.find(a => a.id === assetId);
    if (!asset) return;

    if (asset.type === 'audio') {
      const currentAudioIds = formData.audioIds || [];
      setFormData({ ...formData, audioIds: currentAudioIds.filter(id => id !== assetId) });
    } else {
      const currentAssetIds = formData.assetIds || [];
      if (currentAssetIds.length <= 1) {
        alert('至少需要保留一个动图');
        return;
      }
      setFormData({ ...formData, assetIds: currentAssetIds.filter(id => id !== assetId) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800">交互功能</h3>
          <p className="text-xs text-gray-500">点击功能图标以修改其关联的素材（如动图或音频）</p>
        </div>
      </div>

      <div className="space-y-3">
        {config.buttons.map(btn => {
          const isEditing = editingId === btn.id;

          if (isEditing) {
            const isSing = btn.id === 'sing';
            const assetLabel = isSing ? '动图或音频素材' : '动图素材';

            return (
              <div key={btn.id} className="p-5 border-2 border-blue-500 rounded-xl bg-blue-50/10 space-y-4 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl grayscale-[0.2]">{btn.emoji}</span>
                    <h4 className="font-bold text-slate-800">{btn.name}</h4>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                      <X size={20} />
                    </button>
                    <button onClick={saveEdit} className="p-2 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm">
                      <Check size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">回应文案</label>
                  <input 
                    type="text" 
                    value={formData.response} 
                    onChange={e => setFormData({ ...formData, response: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="猫猫会说什么..."
                  />
                </div>

                {btn.mode === 'action' && (
                  <div className="space-y-4">
                    {/* Visual Assets Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] uppercase font-bold text-slate-400">动作动图 (1-3个)</label>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {formData.assetIds?.length || 0} / 3
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {isSelecting ? (
                          <div className="col-span-3 p-3 bg-white border border-blue-200 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400">选择动图素材</span>
                              <button onClick={() => setIsSelecting(false)} className="text-[10px] text-blue-500 font-bold hover:underline">取消</button>
                            </div>
                            <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {config.assets.filter(a => a.type !== 'audio').map(a => (
                                <button 
                                  key={a.id}
                                  onClick={() => {
                                    addAssetToButton(a.id);
                                    setIsSelecting(false);
                                  }}
                                  className="w-full flex items-center gap-2 p-1.5 hover:bg-blue-50 rounded-md transition-all group"
                                >
                                  <img src={a.url} className="w-8 h-8 rounded object-cover border border-slate-100" />
                                  <span className="text-xs text-slate-700 font-medium group-hover:text-blue-600 truncate">{a.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          [0, 1, 2].map(index => {
                            const assetId = formData.assetIds?.[index];
                            const asset = assetId ? config.assets.find(a => a.id === assetId) : null;
                            
                            return (
                              <div 
                                key={index} 
                                className={`relative aspect-square rounded-lg border-2 border-dashed ${asset ? 'border-slate-200 bg-slate-50' : 'border-blue-200 bg-blue-50/30 cursor-pointer hover:bg-blue-50 hover:border-blue-300'} overflow-hidden flex items-center justify-center group/item transition-all`}
                                onClick={() => !asset && setIsSelecting(true)}
                              >
                                {asset ? (
                                  <>
                                    <img src={asset.url} className="w-full h-full object-cover" alt="preview" />
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeAssetFromButton(assetId!);
                                      }}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover/item:opacity-100 transition-all shadow-md"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center gap-1 opacity-60">
                                    <Plus size={16} className="text-blue-400" />
                                    <span className="text-[8px] font-bold text-blue-500">添加</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Audio Assets Section (Singing only) */}
                    {btn.id === 'sing' && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] uppercase font-bold text-slate-400">播放歌曲 (可选)</label>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {formData.audioIds?.length || 0}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {formData.audioIds?.map(aid => {
                              const asset = config.assets.find(a => a.id === aid);
                              if (!asset) return null;
                              return (
                                <div key={aid} className="flex items-center gap-2 pl-2 pr-1 py-1 bg-white border border-slate-200 rounded-lg text-xs">
                                  <Music size={12} className="text-slate-400" />
                                  <span className="truncate max-w-[80px]">{asset.name}</span>
                                  <button onClick={() => removeAssetFromButton(aid)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                                    <X size={12} />
                                  </button>
                                </div>
                              );
                            })}
                            <button 
                              onClick={() => setIsSelectingAudio(true)}
                              className="px-3 py-1 bg-blue-50 border border-blue-100 text-blue-500 rounded-lg text-xs font-bold hover:bg-blue-100 transition-all"
                            >
                              + 添加歌曲
                            </button>
                          </div>

                          {isSelectingAudio && (
                            <div className="p-3 bg-white border border-orange-200 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400">选择要播放的歌曲</span>
                                <button onClick={() => setIsSelectingAudio(false)} className="text-[10px] text-blue-500 font-bold hover:underline">取消</button>
                              </div>
                              <div className="max-h-[120px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                {config.assets.filter(a => a.type === 'audio' && !formData.audioIds?.includes(a.id)).map(a => (
                                  <button 
                                    key={a.id}
                                    onClick={() => {
                                      addAssetToButton(a.id);
                                      setIsSelectingAudio(false);
                                    }}
                                    className="w-full flex items-center gap-2 p-1.5 hover:bg-orange-50 rounded-md transition-all group"
                                  >
                                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center border border-slate-100">
                                      <Music size={16} className="text-slate-400" />
                                    </div>
                                    <span className="text-xs text-slate-700 font-medium group-hover:text-orange-600 truncate">{a.name}</span>
                                  </button>
                                ))}
                                {config.assets.filter(a => a.type === 'audio').length === 0 && (
                                  <div className="text-center py-4 text-xs text-slate-400">请先在素材库上传音频文件</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 pt-2">
                      <label className="text-[10px] uppercase font-bold text-slate-400">动作时长 (秒 - 0为永久)</label>
                      <input 
                        type="number" 
                        value={formData.duration} 
                        onChange={e => setFormData({ ...formData, duration: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={btn.id} className="group p-4 bg-white border border-slate-200 rounded-lg flex items-center justify-between hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer" onClick={() => startEdit(btn)}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-lg text-xl group-hover:bg-blue-50 group-hover:scale-105 transition-all grayscale-[0.3]">
                  {btn.emoji}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">{btn.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 truncate max-w-[150px] font-medium">{btn.response || '无文本回应'}</p>
                    {btn.mode === 'action' && (
                      <span className="text-[10px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold">
                        {btn.assetIds?.length || 0} 素材
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-2 text-slate-300 group-hover:text-blue-500 transition-all">
                <Edit2 size={16} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
