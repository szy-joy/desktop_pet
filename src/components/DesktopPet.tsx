import { useState, useEffect, useRef, MouseEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppConfig, InteractionButton, Asset } from '../types';

interface DesktopPetProps {
  config: AppConfig;
  onOpenPanel: () => void;
}

export default function DesktopPet({ config, onOpenPanel }: DesktopPetProps) {
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 300 });
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [currentAssetOverride, setCurrentAssetOverride] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0); // For triggering click animations

  const bubbleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentAsset = config.assets.find(a => a.id === (currentAssetOverride || config.currentAssetId)) || config.assets[0];

  useEffect(() => {
    // Initial position bottom-right
    setPosition({ x: window.innerWidth - config.appearance.size - 40, y: window.innerHeight - config.appearance.size - 40 });
  }, [config.appearance.size]);

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
      idleIntervalRef.current = setTimeout(() => {
        if (config.idleMessages.length > 0) {
          const msg = config.idleMessages[Math.floor(Math.random() * config.idleMessages.length)];
          showBubble(msg);
        }
        setNextIdle();
      }, wait);
    };

    setNextIdle();
    return () => {
      if (idleIntervalRef.current) clearTimeout(idleIntervalRef.current);
    };
  }, [config.idleMessages]);

  const handleClick = () => {
    setAnimationKey(prev => prev + 1);
    const randomBubble = ["喵呜~", "摸摸头...", "嘿嘿嘿", "看什么看", "你好呀"];
    showBubble(randomBubble[Math.floor(Math.random() * randomBubble.length)]);
  };

  const handleInteraction = (btn: InteractionButton) => {
    showBubble(btn.response);
    if (btn.mode === 'action' && btn.actionAsset) {
      setCurrentAssetOverride(btn.actionAsset);
      setTimeout(() => setCurrentAssetOverride(null), btn.duration * 1000);
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
          updateMouseIgnore(true);
        }}
        style={{ width: config.appearance.size, height: config.appearance.size }}
      >
        {/* Interaction Buttons (Hover) */}
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="absolute left-full ml-4 bottom-4 flex flex-col gap-2 z-20"
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
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-full left-0 mb-4 px-4 py-2 bg-white border border-slate-200 shadow-lg rounded-2xl text-slate-700 text-sm whitespace-pre-wrap max-w-xs z-30"
            >
              {bubbleText}
              <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white rotate-45 border-r border-b border-slate-200" />
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
