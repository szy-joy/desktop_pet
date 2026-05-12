export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
}

export interface InteractionButton {
  id: string;
  emoji: string;
  name: string;
  response: string;
  mode: 'text' | 'action';
  actionAsset: string; // Asset ID or URL
  duration: number; // in seconds
}

export interface AppConfig {
  assets: Asset[];
  currentAssetId: string;
  buttons: InteractionButton[];
  idleMessages: string[];
  appearance: {
    size: number;
  };
}
