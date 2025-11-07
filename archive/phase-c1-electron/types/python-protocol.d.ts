export type RecorderCommand = 'start' | 'stop' | 'quit';

export type RecorderResponse =
  | ReadyResponse
  | RecordingStartedResponse
  | RecordingStoppedResponse
  | ErrorResponse;

export interface ReadyResponse {
  type: 'READY';
}

export interface RecordingStartedResponse {
  type: 'RECORDING_STARTED';
  timestamp: number;
}

export interface RecordingStoppedResponse {
  type: 'RECORDING_STOPPED';
  filename: string;
  duration?: number;
}

export interface ErrorResponse {
  type: 'ERROR';
  message: string;
}
