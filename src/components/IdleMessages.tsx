import { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, MessageCircle } from 'lucide-react';
import { AppConfig } from '../types';

interface IdleMessagesProps {
  config: AppConfig;
  onUpdate: (config: AppConfig) => void;
}

export default function IdleMessages({ config, onUpdate }: IdleMessagesProps) {
  const [newMsg, setNewMsg] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const addMsg = () => {
    if (!newMsg.trim()) return;
    onUpdate({ ...config, idleMessages: [...config.idleMessages, newMsg] });
    setNewMsg('');
  };

  const removeMsg = (index: number) => {
    const newMsgs = config.idleMessages.filter((_, i) => i !== index);
    onUpdate({ ...config, idleMessages: newMsgs });
  };

  const saveEdit = () => {
    if (editingIndex === null || !editValue.trim()) return;
    const newMsgs = [...config.idleMessages];
    newMsgs[editingIndex] = editValue;
    onUpdate({ ...config, idleMessages: newMsgs });
    setEditingIndex(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800">闲置消息</h3>
        <p className="text-xs text-gray-500">猫猫会在待机每隔 15-35 秒随机说出的话</p>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          placeholder="给猫猫加点戏..."
          className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
          onKeyDown={e => e.key === 'Enter' && addMsg()}
        />
        <button 
          onClick={addMsg}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium text-sm flex items-center justify-center min-w-[44px]"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-2">
        {config.idleMessages.map((msg, index) => {
          const isEditing = editingIndex === index;
          return (
            <div key={index} className="group flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 hover:shadow-sm transition-all">
              {isEditing ? (
                <div className="flex-1 flex gap-2">
                  <input 
                    type="text" 
                    autoFocus
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="flex-1 px-2 py-1 bg-blue-50 border border-blue-100 rounded-lg outline-none text-sm"
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  />
                  <button onClick={saveEdit} className="text-blue-600 p-1"><Check size={16}/></button>
                  <button onClick={() => setEditingIndex(null)} className="text-slate-400 p-1"><X size={16}/></button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <MessageCircle size={14} className="text-slate-300" />
                    <span className="text-sm text-slate-700 font-medium">{msg}</span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => { setEditingIndex(index); setEditValue(msg); }}
                      className="p-1.5 hover:bg-blue-50 text-blue-500 rounded-lg"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => removeMsg(index)}
                      className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
