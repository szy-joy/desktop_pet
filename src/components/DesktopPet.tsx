import { useState, useEffect, useRef, MouseEvent, useCallback, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Music, X } from 'lucide-react';
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
  
  // Audio/Music player state
  const [isSinging, setIsSinging] = useState(false);
  const [currentSong, setCurrentSong] = useState<Asset | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  
  // Pomodoro (Cat Supervisor) state
  const [pomodoroTime, setPomodoroTime] = useState(0);
  const [showPomodoroPicker, setShowPomodoroPicker] = useState(false);
  const [pomodoroDuration, setPomodoroDuration] = useState(25); // Default 25 mins

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
  const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopSinging = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSinging(false);
    setCurrentSong(null);
    setIsPlaying(false);
    setAudioProgress(0);
  }, []);

  // Sync state with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    const onLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const onEnded = () => {
      playNextSong();
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [currentSong]);

  // Audio logic for singing
  const playSong = (song: Asset) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(song.url);
    audioRef.current = audio;
    setCurrentSong(song);
    setIsSinging(true);
    setIsPlaying(true);
    audio.play().catch(e => console.error("Audio playback failed:", e));
  };

  const playNextSong = () => {
    const btn = config.buttons.find(b => b.id === 'sing');
    if (!btn) return;

    const audioAssets = config.assets.filter(a => a.type === 'audio');
    const preferredSongs = audioAssets.filter(a => btn.audioIds?.includes(a.id));
    let pool = preferredSongs.length > 0 ? preferredSongs : audioAssets;

    if (pool.length > 1 && currentSong) {
      pool = pool.filter(s => s.id !== currentSong.id);
    }

    if (pool.length > 0) {
      const songToPlay = pool[Math.floor(Math.random() * pool.length)];
      playSong(songToPlay);
    } else {
      stopSinging();
      showBubble("没有更多歌曲了喵~", 2000);
    }
  };

  const playPrevSong = () => {
    // For simplicity, just pick another random song since it's a random player
    // but try to avoid current
    playNextSong();
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (e: ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
    audioRef.current.currentTime = seekTime;
    setAudioProgress(parseFloat(e.target.value));
  };

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

    // Interaction history for clicking the cat
    const now = Date.now();
    
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

    // Interaction history for normal interactions
    const now = Date.now();
    
    setHistory(prev => [...prev, { buttonId: btn.id, timestamp: now }]);

    // Stop singing if starting any other interaction
    if (btn.id !== 'sing') {
      stopSinging();
    }

    // Clear interaction state
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
      interactionTimeoutRef.current = null;
    }
    setCurrentAssetOverride(null);

    showBubble(btn.response);
    
    // Audio logic for singing
    if (btn.id === 'sing') {
      if (isSinging && isPlaying) {
        // If already singing and playing, clicking button again might toggle or do nothing
        // User didn't specify, I'll keep it playing or restart
      }
      playNextSong();
    }

    if (btn.mode === 'action' && btn.assetIds && btn.assetIds.length > 0) {
      // Filter for visual assets only to override the pet's appearance
      const visualAssets = config.assets.filter(a => btn.assetIds.includes(a.id) && a.type !== 'audio');
      
      if (visualAssets.length > 0) {
        const randomAssetId = visualAssets[Math.floor(Math.random() * visualAssets.length)].id;
        setCurrentAssetOverride(randomAssetId);
        
        // Only set timeout if duration > 0. 0 means infinite.
        if (btn.duration > 0) {
          interactionTimeoutRef.current = setTimeout(() => {
            setCurrentAssetOverride(null);
            interactionTimeoutRef.current = null;
          }, btn.duration * 1000);
        }
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
              className={`absolute ${(position.x + config.appearance.size + 160 > window.innerWidth) ? 'right-full mr-3' : 'left-full ml-3'} bottom-4 flex flex-col gap-1 z-20`}
            >
              {config.buttons.map(btn => (
                <button
                  key={btn.id}
                  onClick={(e) => { e.stopPropagation(); handleInteraction(btn); }}
                  className="flex items-center gap-1.5 px-2 py-1.5 bg-white/95 backdrop-blur-md shadow-md rounded-md border border-slate-100/50 hover:bg-white hover:scale-105 active:scale-95 transition-all text-[10px] font-bold text-slate-700 whitespace-nowrap min-w-[60px] ring-1 ring-black/5"
                >
                  <span className="text-sm grayscale-[0.2]">{btn.emoji}</span>
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
              className={`absolute ${position.y < 120 ? 'top-full mt-4' : 'bottom-full mb-4'} left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white/95 backdrop-blur-sm border-2 border-slate-100 shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded-xl text-slate-800 text-[11px] font-bold whitespace-nowrap z-30 flex items-center justify-center`}
            >
              {bubbleText}
              <div className={`absolute left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 rotate-45 border-slate-100 ${position.y < 120 ? '-top-[7px] border-l-2 border-t-2' : '-bottom-[7px] border-r-2 border-b-2'}`} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Music Player Widget */}
        <AnimatePresence>
          {isSinging && currentSong && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{ width: config.appearance.size }}
              className="absolute left-1/2 -translate-x-1/2 top-full mt-1 flex flex-col z-40 pointer-events-auto overflow-hidden rounded-lg shadow-xl border border-white/40 ring-1 ring-black/5"
            >
               {/* Main Compact Interface */}
               <div className="flex items-center px-2 py-1 bg-white/70 backdrop-blur-xl gap-3 h-9">
                  {/* Song Title & Progress */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-slate-800 truncate block leading-tight">
                      {currentSong.name.replace(/\.[^/.]+$/, "")}
                    </span>
                    <div className="flex justify-between text-[6px] font-mono text-slate-500 leading-none mt-0.5 opacity-80">
                      <span>{formatTime(Math.floor(audioDuration * (audioProgress / 100)))}</span>
                      <span>{formatTime(Math.floor(audioDuration))}</span>
                    </div>
                  </div>

                  {/* Compact Controls */}
                  <div className="flex items-center gap-1.5 shrink-0 px-1">
                    <button onClick={playPrevSong} className="text-slate-500 hover:text-blue-500 transition-colors">
                      <SkipBack size={11} fill="currentColor" />
                    </button>
                    <button 
                      onClick={togglePlayback}
                      className="w-5 h-5 flex items-center justify-center bg-white/50 text-slate-700 rounded-full hover:bg-white hover:text-blue-600 transition-all border border-slate-100 shadow-sm"
                    >
                      {isPlaying ? <Pause size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" className="translate-x-0.5" />}
                    </button>
                    <button onClick={playNextSong} className="text-slate-500 hover:text-blue-500 transition-colors">
                      <SkipForward size={11} fill="currentColor" />
                    </button>
                  </div>
               </div>

               {/* Custom Filled Progress Bar (No Thumb) */}
               <div className="relative h-1 bg-slate-200/50 backdrop-blur-md">
                  {/* Filled part */}
                  <div 
                    className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-300 ease-linear shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                    style={{ width: `${audioProgress}%` }}
                  />
                  {/* Invisible Input for Seeking */}
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={audioProgress}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
               </div>
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
                  }}
                  className="px-3 py-1 bg-red-500/90 hover:bg-red-600 text-white rounded-full text-[10px] font-bold shadow-lg transition-all scale-90 hover:scale-100"
                >
                  结束监工
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>


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
