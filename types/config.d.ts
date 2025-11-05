export interface AppConfig {
  app: {
    name: string;
    version: string;
  };
  paths: {
    audioDir: string;
    transcriptDir: string;
    databaseDir: string;
    databaseFile: string;
    modelsDir: string;
    pythonVenv: string;
    recorderScript: string;
    transcriberScript: string;
    preloadScript: string;
    indexHtml: string;
    historyHtml: string;
  };
  recording: {
    sampleRate: number;
    channels: number;
    format: string;
    bitDepth: number;
  };
  transcription: {
    model: string;
    language: string;
    threads: number;
  };
  shortcuts: {
    toggleRecording: string;
  };
  logging: {
    level: string;
    format: string;
    retention: string;
  };
  metrics: {
    enabled: boolean;
    port: number;
  };
  sentry: {
    enabled: boolean;
    dsn: string;
  };
}
