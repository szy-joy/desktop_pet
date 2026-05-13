import { useState, useEffect, useRef, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart } from 'lucide-react';
import { AppConfig, InteractionButton, Asset } from '../types';

interface DesktopPetProps {
  config: AppConfig;
  onOpenPanel: () => void;
  onUpdateConfig: (newConfig: AppConfig) => Promise<void>;
  isPanelOpen?: boolean;
}

interface InteractionHistory {
  buttonId: string;
  timestamp: number;
}

export default function DesktopPet({ config, onOpenPanel, onUpdateConfig, isPanelOpen }: DesktopPetProps) {
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 300 });
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentAssetOverride, setCurrentAssetOverride] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0); 
  
  // Interaction history for affection rate limiting
  const [history, setHistory] = useState<InteractionHistory[]>([]);
  
  // Pomodoro (Cat Supervisor) state
  const [pomodoroTime, setPomodoroTime] = useState(0);
  const [showPomodoroPicker, setShowPomodoroPicker] = useState(false);
  const [pomodoroDuration, setPomodoroDuration] = useState(25); // Default 25 mins

  // Action to update affection score
  const updateAffection = (delta: number) => {
    const newScore = Math.max(0, (config.affectionScore || 0) + delta);
    onUpdateConfig({ ...config, affectionScore: newScore });
  };

  // 获取屏幕可用区域作为拖拽限制（自动避开任务栏/Dock）
  const [dragConstraints, setDragConstraints] = useState({ left: 0, top: 0, right: 0, bottom: 0 });

  const isFirstMount = useRef(true);

  useEffect(() => {
    const updateConstraints = () => {
      const padding = 20;
      const maxX = window.innerWidth - config.appearance.size - padding;
      const maxY = window.innerHeight - config.appearance.size - padding;
      setDragConstraints({ left: padding, top: padding, right: maxX, bottom: maxY });
      
      if (isFirstMount.current) {
        setPosition({ x: maxX, y: maxY });
        isFirstMount.current = false;
      } else {
        setPosition(prev => ({
          x: Math.min(prev.x, maxX),
          y: Math.min(prev.y, maxY)
        }));
      }
    };

    updateConstraints();
    window.addEventListener('resize', updateConstraints);
    return () => window.removeEventListener('resize', updateConstraints);
  }, [config.appearance.size]);

  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleMsgTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleAssetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Randomly pick an idle asset ("常规") every 10-20 seconds if not busy
  useEffect(() => {
    if (currentAssetOverride || pomodoroTime > 0) return;

    const changeIdleAsset = () => {
      const wait = Math.floor(Math.random() * (20000 - 10000) + 10000);
      idleAssetTimeoutRef.current = setTimeout(() => {
        const idleAssets = config.assets.filter(a => a.name.includes('常规'));
        if (idleAssets.length > 0) {
          const randomAsset = idleAssets[Math.floor(Math.random() * idleAssets.length)];
          setCurrentAssetOverride(randomAsset.id);
        }
        changeIdleAsset();
      }, wait);
    };

    changeIdleAsset();
    return () => {
      if (idleAssetTimeoutRef.current) clearTimeout(idleAssetTimeoutRef.current);
    };
  }, [config.assets, currentAssetOverride, pomodoroTime]);

  const currentAsset = config.assets.find(a => a.id === (currentAssetOverride || config.currentAssetId)) || config.assets[0];

  // Bubble helper
  const showBubble = (text: string, duration = 3000) => {
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    setBubbleText(text);
    bubbleTimeoutRef.current = setTimeout(() => setBubbleText(null), duration);
  };

  // Idle messages logic
  useEffect(() => {
    const setNextIdle = () => {
      const wait = Math.floor(Math.random() * (35000 - 15000) + 15000);
      idleMsgTimeoutRef.current = setTimeout(() => {
        if (config.idleMessages.length > 0 && pomodoroTime === 0) {
          const msg = config.idleMessages[Math.floor(Math.random() * config.idleMessages.length)];
          showBubble(msg);
        }
        setNextIdle();
      }, wait);
    };

    setNextIdle();
    return () => {
      if (idleMsgTimeoutRef.current) clearTimeout(idleMsgTimeoutRef.current);
    };
  }, [config.idleMessages, pomodoroTime]);

  // Pomodoro timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomodoroTime > 0) {
      interval = setInterval(() => {
        setPomodoroTime(prev => {
          if (prev <= 1) {
            showBubble("干得漂亮！任务完成了喵~", 5000);
            updateAffection(5);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pomodoroTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClick = () => {
    setAnimationKey(prev => prev + 1);
    if (pomodoroTime > 0) {
      showBubble("要好好工作！", 2000);
      return;
    }

    // Affection logic for clicking the cat
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const sameInteractionsInLastHour = history.filter(h => h.buttonId === 'click' && h.timestamp > oneHourAgo);
    
    if (sameInteractionsInLastHour.length < 3) {
      updateAffection(1);
    }
    setHistory(prev => [...prev, { buttonId: 'click', timestamp: now }]);

    const randomBubble = ["喵呜~", "摸摸头...", "嘿嘿嘿", "看什么看", "你好呀"];
    showBubble(randomBubble[Math.floor(Math.random() * randomBubble.length)]);
  };

  const handleInteraction = (btn: InteractionButton) => {
    if (pomodoroTime > 0) {
      showBubble("要好好工作！", 2000);
      return;
    }
    if (btn.id === 'pomodoro') {
      setShowPomodoroPicker(true);
      return;
    }

    // Affection logic for normal interactions
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const sameInteractionsInLastHour = history.filter(h => h.buttonId === btn.id && h.timestamp > oneHourAgo);
    
    if (sameInteractionsInLastHour.length < 3) {
      updateAffection(1);
    }
    setHistory(prev => [...prev, { buttonId: btn.id, timestamp: now }]);

    showBubble(btn.response);
    if (btn.mode === 'action' && btn.actionAsset) {
      // Find all assets that match the action name (e.g. "吃饭" matches "吃饭1", "吃饭2")
      const matchingAssets = config.assets.filter(a => a.name.includes(btn.actionAsset));
      if (matchingAssets.length > 0) {
        const randomAsset = matchingAssets[Math.floor(Math.random() * matchingAssets.length)];
        setCurrentAssetOverride(randomAsset.id);
        setTimeout(() => setCurrentAssetOverride(null), btn.duration * 1000);
      }
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    onOpenPanel();
  };

  // 控制 Electron 鼠标穿透
  const updateMouseIgnore = (ignore: boolean) => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('set-ignore-mouse-events', ignore, { forward: true });
      } catch (e) { /* ignore */ }
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-10">
      <motion.div
        drag
        dragConstraints={dragConstraints}
        dragElastic={0.05}
        dragMomentum={false}
        initial={position}
        onDragStart={() => updateMouseIgnore(false)}
        onDragEnd={(_, info) => {
          setPosition({ x: info.point.x, y: info.point.y });
          updateMouseIgnore(false);
        }}
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing group"
        onContextMenu={handleContextMenu}
        onMouseEnter={() => {
          setIsHovered(true);
          updateMouseIgnore(false);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          if (!isPanelOpen) {
            updateMouseIgnore(true);
          }
        }}
        style={{ width: config.appearance.size, height: config.appearance.size }}
      >
        {/* Interaction Buttons (Hover) */}
        <AnimatePresence>
          {isHovered && pomodoroTime === 0 && (
            <motion.div 
              initial={{ opacity: 0, x: (position.x + config.appearance.size + 160 > window.innerWidth) ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: (position.x + config.appearance.size + 160 > window.innerWidth) ? 10 : -10 }}
              className={`absolute ${(position.x + config.appearance.size + 160 > window.innerWidth) ? 'right-full mr-4' : 'left-full ml-4'} bottom-4 flex flex-col gap-2 z-20`}
            >
              {config.buttons.map(btn => (
                <button
                  key={btn.id}
                  onClick={(e) => { e.stopPropagation(); handleInteraction(btn); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md shadow-lg rounded-lg border border-slate-200 hover:bg-white hover:scale-105 transition-all text-xs font-semibold text-slate-800 whitespace-nowrap"
                >
                  <span className="text-base">{btn.emoji}</span>
                  <span>{btn.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bubble Message */}
        <AnimatePresence>
          {bubbleText && (
            <motion.div
              initial={{ opacity: 0, y: (position.y < 120) ? -10 : 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={`absolute ${position.y < 120 ? 'top-full mt-4' : 'bottom-full mb-4'} left-0 px-4 py-2 bg-white border border-slate-200 shadow-lg rounded-2xl text-slate-700 text-sm whitespace-pre-wrap max-w-xs z-30`}
            >
              {bubbleText}
              <div className={`absolute left-4 w-4 h-4 bg-white rotate-45 border-slate-200 ${position.y < 120 ? '-top-2 border-l border-t' : '-bottom-2 border-r border-b'}`} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pomodoro Indicator (Floating) */}
        <AnimatePresence>
          {pomodoroTime > 0 && (
            <motion.div
              initial={{ opacity: 0, y: (position.y < window.innerHeight / 2) ? -10 : 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`absolute left-1/2 -translate-x-1/2 ${position.y < window.innerHeight / 2 ? 'top-full mt-2' : 'bottom-full mb-2'} 
                flex flex-col items-center gap-1 min-w-[120px] pointer-events-auto`}
            >
              <div className="bg-slate-800/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-slate-700/50 flex flex-col items-center">
                <div className="text-xl font-mono font-bold text-white leading-none">{formatTime(pomodoroTime)}</div>
              </div>
              
              {isHovered && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setPomodoroTime(0); 
                    showBubble("竟然放弃了... 哼！"); 
                    updateAffection(-3);
                  }}
                  className="px-3 py-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full text-[10px] font-bold shadow-lg transition-all scale-90 hover:scale-100"
                >
                  结束监工
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Affection Bar */}
        <div className={`absolute left-1/2 -translate-x-1/2 ${pomodoroTime > 0 ? 'top-[calc(100%+80px)]' : 'top-[calc(100%+10px)]'} flex items-center gap-2 z-30 transition-all duration-300 pointer-events-none`}>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 flex-shrink-0" />
          <div className="w-24 h-1.5 bg-slate-200/50 rounded-full overflow-hidden border border-white/50 shadow-inner backdrop-blur-sm">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((config.affectionScore || 0) / 100) * 100)}%` }}
              className="h-full bg-gradient-to-r from-rose-400 to-pink-500"
            />
          </div>
          <span className="text-[11px] font-bold text-slate-600 font-mono leading-none">
            {config.affectionScore || 0}
          </span>
        </div>

        {/* The Cat Sprite */}
        <motion.div
          key={animationKey}
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.05, 1],
          }}
          whileHover={{ scale: 1.08 }}
          transition={{
            duration: 0.3,
            repeat: 0,
            ease: "easeOut"
          }}
          className="relative w-full h-full rounded-2xl overflow-hidden group/cat transition-all"
          onClick={handleClick}
        >
          {/* Time Picker Modal (Pomodoro) */}
          <AnimatePresence>
            {showPomodoroPicker && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute inset-4 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-center p-4 gap-4 z-[60] border border-slate-200"
              >
                <div className="text-sm font-bold text-slate-800">设置监工时长</div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPomodoroDuration(prev => Math.max(5, prev - 5))} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600">-</button>
                  <span className="text-2xl font-mono font-bold text-slate-800 w-12 text-center">{pomodoroDuration}</span>
                  <button onClick={() => setPomodoroDuration(prev => Math.min(120, prev + 5))} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600">+</button>
                </div>
                <div className="text-[10px] text-slate-400">单位：分钟</div>
                <div className="flex gap-2 w-full mt-2">
                  <button 
                    onClick={() => setShowPomodoroPicker(false)}
                    className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50"
                  >
                    取消
                  </button>
                  <button 
                    onClick={() => {
                      setPomodoroTime(pomodoroDuration * 60);
                      setShowPomodoroPicker(false);
                      showBubble("这就开始监视你工作！不许偷懒！", 4000);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 text-white text-xs hover:bg-slate-900 shadow-md"
                  >
                    确定
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Internal Gear Button (Appear on Hover) */}
          <div 
            onClick={(e) => { e.stopPropagation(); onOpenPanel(); }}
            className="absolute top-2 right-2 w-8 h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover/cat:opacity-100 transition-all cursor-pointer z-50 text-slate-600 shadow-sm shadow-black/5"
          >
            ⚙️
          </div>
          {currentAsset.type === 'video' ? (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              src={currentAsset.url} 
              className="w-full h-full object-contain pointer-events-none drop-shadow-lg"
            />
          ) : (
            <img 
              referrerPolicy="no-referrer"
              src={currentAsset.url} 
              alt="Cat"
              className="w-full h-full object-contain pointer-events-none drop-shadow-lg"
            />
          )}

          {/* Optional Idle Animation Overlays (Blinking etc) could go here */}
          <motion.div 
            animate={{ 
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 pointer-events-none"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
