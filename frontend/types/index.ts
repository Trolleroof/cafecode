export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
  language?: string;
  size?: number;
  modified?: Date;
}

export type SearchFilter = 'all' | 'name';
