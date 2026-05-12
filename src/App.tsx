import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from 'lucide-react';
import DesktopPet from './components/DesktopPet';
import ControlPanel from './components/ControlPanel';
import { AppConfig } from './types';

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
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

  const saveConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig);
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
        onOpenPanel={() => setShowPanel(true)} 
      />

      {/* Control Panel Modal */}
      {showPanel && (
        <ControlPanel 
          config={config} 
          onSave={saveConfig} 
          onClose={() => setShowPanel(false)} 
        />
      )}
    </div>
  );
}
