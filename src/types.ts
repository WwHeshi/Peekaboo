export type Mood =
  | 'idle'
  | 'smile'
  | 'happy'
  | 'curious'
  | 'thinking'
  | 'surprised'
  | 'sleepy'
  | 'sad';

export type Role = 'you' | 'pet' | 'system';

export type ChatMessage = {
  role: Role;
  text: string;
};

export type ScreenSummary = {
  summary: string;
  confidence: 'low' | 'medium' | 'high';
};

export type PetReply = {
  text: string;
  mood: Mood;
};

export type AppConfig = {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  petName: string;
};

export type AppState = {
  mood: Mood;
  status: string;
  messages: ChatMessage[];
  screenSummary?: ScreenSummary;
};
