import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from 'lucide-react';
import DesktopPet from './components/DesktopPet';
import ControlPanel from './components/ControlPanel';
import { AppConfig } from './types';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  // 控制 Electron 鼠标穿透
  const updateMouseIgnore = (ignore: boolean) => {
    if ((window as any).require) {
      try {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.send('set-ignore-mouse-events', ignore, { forward: true });
      } catch (e) { /* ignore */ }
    }
  };

  const handleOpenPanel = () => {
    setShowPanel(true);
    updateMouseIgnore(false);
  };

  const handleClosePanel = () => {
    setShowPanel(false);
    updateMouseIgnore(true);
  };

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        if (text.includes('Cookie check')) {
          console.error('Environment auth issue detected');
        }
        throw new Error('Server returned non-JSON for config');
      }
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error('Failed to fetch config:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const saveConfig = async (newConfig: AppConfig) => {
    // Optimistic UI update
    setConfig(newConfig);

    // Debounce actual server save
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConfig),
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      } catch (err) {
        console.error('Failed to save config:', err);
      }
    }, 500);
  };

  if (loading || !config) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-transparent pointer-events-none">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent select-none">
      {/* Desktop Pet Container */}
      <DesktopPet 
        config={config} 
        onOpenPanel={handleOpenPanel}
        onUpdateConfig={saveConfig}
        isPanelOpen={showPanel}
      />

      {/* Control Panel Modal */}
      {showPanel && (
        <ControlPanel 
          config={config} 
          onSave={saveConfig} 
          onClose={handleClosePanel} 
        />
      )}
    </div>
  );
}
