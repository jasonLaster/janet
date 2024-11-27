export interface RenameMapping {
  oldName: string;
  newName: string;
  success: boolean;
  timestamp: string;
  content?: string;
}

export interface FileMapping {
  originalPath: string;
  newPath: string;
  ocrPath?: string;
}

export interface RemappingCache {
  version: string;
  mappings: {
    [key: string]: FileMapping;
  };
} 