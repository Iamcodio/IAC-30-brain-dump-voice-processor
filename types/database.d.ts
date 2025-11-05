export interface Recording {
  id: number;
  audio_path: string;
  transcript_path: string;
  transcript_text: string;
  created_at: string;
  duration?: number;
  word_count?: number;
}

export interface SearchOptions {
  query?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'created_at' | 'duration' | 'word_count';
  order?: 'ASC' | 'DESC';
}
