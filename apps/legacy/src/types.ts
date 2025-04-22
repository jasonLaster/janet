export interface RenameMapping {
  success: boolean;
  oldName: string;
  newName: string;
  content: string;
  timestamp: string;
  needsRename?: boolean;
}

export interface FileMapping {
  originalPath: string;
  newPath: string;
  ocrPath?: string;
}

export interface RemappingCache {
  [key: string]: RenameMapping;
} 