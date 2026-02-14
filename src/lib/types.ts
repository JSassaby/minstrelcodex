export interface DocumentData {
  content: string;
  lastModified: string;
}

export interface CurrentDocument {
  filename: string;
  content: string;
  saved: boolean;
  lastModified: string | null;
}

export interface FileNode {
  type: 'file' | 'folder';
  name: string;
  children?: Record<string, FileNode>;
  collapsed?: boolean;
}

export interface FileStructure {
  root: FileNode;
}

export interface AppColors {
  text: string;
  background: string;
}

export interface TypingBestScores {
  wpm: number;
  accuracy: number;
}

export type ModalType =
  | 'save'
  | 'open'
  | 'recent'
  | 'new'
  | 'new-folder'
  | 'move-to-folder'
  | 'colors'
  | 'typing'
  | 'pin-setup'
  | 'pin-lock'
  | 'gdrive'
  | null;

export type Language = 'en-GB' | 'en-US' | 'af';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface PinConfig {
  enabled: boolean;
  pin: string;
  length: 4 | 6;
}
