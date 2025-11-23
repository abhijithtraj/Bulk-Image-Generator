export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  fileName: string;
  originalName?: string;
  timestamp: number;
}

export enum AppMode {
  EDITOR = 'EDITOR',
  BULK = 'BULK'
}

export interface ExcelRow {
  [key: string]: string | number | boolean;
}

export interface ProcessingStatus {
  total: number;
  completed: number;
  isProcessing: boolean;
  currentAction?: string;
}