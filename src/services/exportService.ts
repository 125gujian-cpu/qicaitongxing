import type JSZip from 'jszip';
import type { PhotoItem, PhotoStatus } from '../types/photo';
import { ensureExtension, sanitizeFilenameBase } from './filenameService';

export interface ExportProgress {
  percent: number;
  currentFile: string;
}

const STATUS_FOLDER: Record<PhotoStatus, string> = {
  good: '好片',
  maybe: '待保留',
  reject: '废片',
  unclassified: '未分类',
};

export function finalExportPath(photo: Pick<PhotoItem, 'renamedName' | 'originalName' | 'extension'>): string {
  return ensureExtension(photo.renamedName ?? photo.originalName, photo.extension);
}

export function classifiedExportPaths(photos: Pick<PhotoItem, 'status' | 'originalName' | 'extension'>[]): string[] {
  const used = new Set<string>();
  return photos.map((photo) => {
    const folder = STATUS_FOLDER[photo.status];
    const base = sanitizeFilenameBase(photo.originalName) || '照片';
    let name = ensureExtension(base, photo.extension);
    let number = 2;
    while (used.has(`${folder}/${name}`.toLocaleLowerCase('zh-CN'))) {
      name = ensureExtension(`${base}_${number++}`, photo.extension);
    }
    const path = `${folder}/${name}`;
    used.add(path.toLocaleLowerCase('zh-CN'));
    return path;
  });
}

async function generate(zip: JSZip, onProgress?: (value: ExportProgress) => void): Promise<Blob> {
  return zip.generateAsync(
    { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 4 }, streamFiles: true },
    (metadata) => onProgress?.({ percent: metadata.percent, currentFile: metadata.currentFile ?? '' }),
  );
}

export async function exportFinalPhotos(photos: PhotoItem[], onProgress?: (value: ExportProgress) => void): Promise<Blob> {
  const { default: JSZipModule } = await import('jszip');
  const zip = new JSZipModule();
  const ordered = [...photos].sort((a, b) => (a.finalOrder ?? Infinity) - (b.finalOrder ?? Infinity));
  for (const photo of ordered) zip.file(finalExportPath(photo), photo.originalBlob);
  return generate(zip, onProgress);
}

export async function exportClassifiedPhotos(photos: PhotoItem[], onProgress?: (value: ExportProgress) => void): Promise<Blob> {
  const { default: JSZipModule } = await import('jszip');
  const zip = new JSZipModule();
  const paths = classifiedExportPaths(photos);
  photos.forEach((photo, index) => zip.file(paths[index], photo.originalBlob));
  return generate(zip, onProgress);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
