import type JSZip from 'jszip';
import { getExtension, isSupportedImage } from './filenameService';

export interface ImportSource {
  name: string;
  path: string;
  extension: string;
  blob: Blob;
}

export interface ZipReadResult {
  images: ImportSource[];
  ignoredCount: number;
}

const HIDDEN_PATH = /(^|\/)(__MACOSX|\.[^/]+)(\/|$)/;

export async function readZipFile(file: File, signal?: AbortSignal, onProgress?: (current: number, total: number, file: string) => void): Promise<ZipReadResult> {
  if (!file.name.toLowerCase().endsWith('.zip') && file.type !== 'application/zip' && file.type !== 'application/x-zip-compressed') {
    throw new Error('请选择 ZIP 压缩包');
  }
  let zip: JSZip;
  try {
    const { default: JSZipModule } = await import('jszip');
    zip = await JSZipModule.loadAsync(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/password|encrypted/i.test(message)) throw new Error('ZIP 已加密，浏览器无法读取，请先解密后再导入');
    throw new Error('ZIP 无法读取，文件可能损坏、加密或格式异常');
  }
  const entries = Object.values(zip.files).filter((entry) => !entry.dir && !HIDDEN_PATH.test(entry.name));
  const imageEntries = entries.filter((entry) => isSupportedImage(entry.name));
  const images: ImportSource[] = [];
  for (const [index, entry] of imageEntries.entries()) {
    if (signal?.aborted) throw new DOMException('导入已取消', 'AbortError');
    onProgress?.(index, imageEntries.length, entry.name);
    try {
      const blob = await entry.async('blob');
      const name = entry.name.split('/').pop() || entry.name;
      images.push({ name, path: entry.name, extension: getExtension(name), blob });
    } catch {
      // A single corrupt image entry is treated as ignored; valid entries continue importing.
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  onProgress?.(imageEntries.length, imageEntries.length, imageEntries.at(-1)?.name ?? '');
  if (!images.length) throw new Error('ZIP 中没有可读取的 JPG、JPEG、PNG 或 WebP 图片');
  return { images, ignoredCount: entries.length - images.length };
}

export function readImageFiles(files: File[]): ZipReadResult {
  const images = files.filter((file) => isSupportedImage(file.name)).map((file) => ({
    name: file.name,
    path: file.webkitRelativePath || file.name,
    extension: getExtension(file.name),
    blob: file,
  }));
  return { images, ignoredCount: files.length - images.length };
}
