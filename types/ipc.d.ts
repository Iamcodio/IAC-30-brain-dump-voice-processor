export interface RecordingStartedEvent {
  timestamp: number;
}

export interface RecordingStoppedEvent {
  timestamp: number;
  audioPath: string;
  duration?: number;
}

export interface TranscriptionStartedEvent {
  audioPath: string;
}

export interface TranscriptionCompleteEvent {
  audioPath: string;
  transcriptPath: string;
  text: string;
  duration: number;
  wordCount: number;
}

export interface TranscriptionErrorEvent {
  audioPath: string;
  error: string;
}

export type IPCChannel =
  | 'recorder-ready'
  | 'recording-started'
  | 'recording-stopped'
  | 'transcription-started'
  | 'transcription-complete'
  | 'transcription-error'
  | 'get-recordings'
  | 'search-recordings'
  | 'read-file'
  | 'play-audio'
  | 'view-file'
  | 'show-history'
  | 'show-recorder';
