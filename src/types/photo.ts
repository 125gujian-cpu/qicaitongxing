export type PhotoStatus = 'unclassified' | 'good' | 'maybe' | 'reject';
export type AppStep = 'import' | 'screen' | 'final' | 'rename';

export interface PhotoItem {
  id: string;
  originalName: string;
  originalPath: string;
  extension: string;
  renamedName: string | null;
  status: PhotoStatus;
  originalBlob: Blob;
  thumbnailBlob?: Blob;
  width?: number;
  height?: number;
  importedIndex: number;
  finalSelected: boolean;
  finalOrder?: number;
}

export interface ProjectInfo {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  photoCount: number;
}

export type HistoryActionType =
  | 'change-status'
  | 'batch-change-status'
  | 'rename'
  | 'batch-rename'
  | 'select-final'
  | 'remove-final'
  | 'reorder-final';

export interface PhotoPatch {
  id: string;
  fields: Partial<Pick<PhotoItem, 'status' | 'renamedName' | 'finalSelected' | 'finalOrder'>>;
}

export interface HistoryAction {
  type: HistoryActionType;
  timestamp: number;
  before: PhotoPatch[];
  after: PhotoPatch[];
}

export const STATUS_META: Record<PhotoStatus, { label: string; shortLabel: string }> = {
  unclassified: { label: '未分类', shortLabel: '未分类' },
  good: { label: '好片', shortLabel: '好片' },
  maybe: { label: '待保留', shortLabel: '待保留' },
  reject: { label: '废片', shortLabel: '废片' },
};
