import type { PhotoItem } from '../types/photo';

export const SUPPORTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const INVALID_WINDOWS_CHARS = /[<>:"/\\|?*]/g;
const CONTROL_CHARS = /[\u0000-\u001f\u0080-\u009f]/g;
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;
export const MAX_FILENAME_LENGTH = 180;

export function getExtension(name: string): string {
  const clean = name.split(/[?#]/)[0];
  const dot = clean.lastIndexOf('.');
  return dot > clean.lastIndexOf('/') && dot >= 0 ? clean.slice(dot + 1).toLowerCase() : '';
}

export function isSupportedImage(name: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(getExtension(name));
}

export function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return name;
  const ext = name.slice(dot + 1).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext) ? name.slice(0, dot) : name;
}

export function sanitizeFilenameBase(input: string): string {
  let value = stripExtension(input.trim())
    .replace(INVALID_WINDOWS_CHARS, '_')
    .replace(CONTROL_CHARS, '')
    .trim()
    .replace(/[. ]+$/g, '')
    .replace(/_+/g, '_');
  if (WINDOWS_RESERVED.test(value)) value = `_${value}`;
  if (value.length > MAX_FILENAME_LENGTH) value = value.slice(0, MAX_FILENAME_LENGTH).trim();
  return value;
}

export function ensureExtension(input: string, extension: string): string {
  const base = sanitizeFilenameBase(input);
  return base ? `${base}.${extension.toLowerCase()}` : '';
}

export interface BatchRenameOptions {
  prefix: string;
  start: number;
  digits: number;
  separator: string;
}

export function buildBatchNames(
  photos: Pick<PhotoItem, 'extension'>[],
  options: BatchRenameOptions,
): string[] {
  const prefix = sanitizeFilenameBase(options.prefix);
  const separator = options.separator.replace(INVALID_WINDOWS_CHARS, '').slice(0, 3);
  const digits = Math.max(1, Math.min(8, Math.trunc(options.digits || 1)));
  const start = Math.max(0, Math.trunc(options.start || 0));
  return photos.map((photo, index) => {
    const number = String(start + index).padStart(digits, '0');
    return ensureExtension(`${prefix}${separator}${number}`, photo.extension);
  });
}

export interface NameValidation {
  valid: boolean;
  emptyIds: string[];
  duplicateIds: string[];
  invalidIds: string[];
}

export function validatePhotoNames(
  photos: Pick<PhotoItem, 'id' | 'renamedName' | 'originalName' | 'extension'>[],
): NameValidation {
  const emptyIds: string[] = [];
  const duplicateIds = new Set<string>();
  const invalidIds: string[] = [];
  const seen = new Map<string, string>();

  for (const photo of photos) {
    const candidate = photo.renamedName ?? photo.originalName;
    const base = stripExtension(candidate).trim();
    if (!base) emptyIds.push(photo.id);
    if (INVALID_WINDOWS_CHARS.test(base) || CONTROL_CHARS.test(base) || WINDOWS_RESERVED.test(base) || base.length > MAX_FILENAME_LENGTH) {
      invalidIds.push(photo.id);
    }
    INVALID_WINDOWS_CHARS.lastIndex = 0;
    CONTROL_CHARS.lastIndex = 0;
    const finalName = ensureExtension(candidate, photo.extension).toLocaleLowerCase('zh-CN');
    const previous = seen.get(finalName);
    if (previous) {
      duplicateIds.add(previous);
      duplicateIds.add(photo.id);
    } else {
      seen.set(finalName, photo.id);
    }
  }
  return { valid: !emptyIds.length && !duplicateIds.size && !invalidIds.length, emptyIds, duplicateIds: [...duplicateIds], invalidIds };
}

export function resolveDuplicateNames(photos: Pick<PhotoItem, 'id' | 'renamedName' | 'originalName' | 'extension'>[]): Map<string, string> {
  const used = new Set<string>();
  const result = new Map<string, string>();
  for (const photo of photos) {
    const source = photo.renamedName ?? photo.originalName;
    const base = sanitizeFilenameBase(source) || `照片`;
    let attempt = base;
    let suffix = 2;
    let final = ensureExtension(attempt, photo.extension);
    while (used.has(final.toLocaleLowerCase('zh-CN'))) {
      attempt = `${base}_${suffix++}`;
      final = ensureExtension(attempt, photo.extension);
    }
    used.add(final.toLocaleLowerCase('zh-CN'));
    result.set(photo.id, final);
  }
  return result;
}

export function safeZipName(name: string, fallback: string): string {
  const base = sanitizeFilenameBase(name).replace(/\.+$/g, '') || fallback;
  return base.toLowerCase().endsWith('.zip') ? base : `${base}.zip`;
}
