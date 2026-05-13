export interface Asset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio';
}

export interface InteractionButton {
  id: string;
  emoji: string;
  name: string;
  response: string;
  mode: 'text' | 'action';
  assetIds: string[];
  audioIds?: string[];
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
