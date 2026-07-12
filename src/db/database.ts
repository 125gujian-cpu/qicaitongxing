import Dexie, { type EntityTable } from 'dexie';
import type { PhotoItem, ProjectInfo } from '../types/photo';

export interface StoredPhoto extends PhotoItem {
  projectId: string;
}

class PhotoDatabase extends Dexie {
  projects!: EntityTable<ProjectInfo, 'id'>;
  photos!: EntityTable<StoredPhoto, 'id'>;

  constructor() {
    super('shiguang-photo-culler');
    this.version(1).stores({
      projects: 'id, updatedAt',
      photos: 'id, projectId, importedIndex, status, finalSelected',
    });
  }
}

export const db = new PhotoDatabase();

export async function persistProject(project: ProjectInfo, photos: PhotoItem[]): Promise<void> {
  await db.transaction('rw', db.projects, db.photos, async () => {
    await db.projects.put({ ...project, photoCount: photos.length, updatedAt: Date.now() });
    await db.photos.where('projectId').equals(project.id).delete();
    await db.photos.bulkPut(photos.map((photo) => ({ ...photo, projectId: project.id })));
  });
}

export async function updateStoredPhotos(projectId: string, photos: PhotoItem[]): Promise<void> {
  await db.transaction('rw', db.projects, db.photos, async () => {
    await Promise.all(photos.map((photo) => db.photos.update(photo.id, {
      status: photo.status,
      renamedName: photo.renamedName,
      finalSelected: photo.finalSelected,
      finalOrder: photo.finalOrder,
    })));
    await db.projects.update(projectId, { updatedAt: Date.now(), photoCount: photos.length });
  });
}

export async function getLatestProject(): Promise<{ project: ProjectInfo; photos: PhotoItem[] } | null> {
  const project = await db.projects.orderBy('updatedAt').last();
  if (!project) return null;
  const stored = await db.photos.where('projectId').equals(project.id).sortBy('importedIndex');
  return { project, photos: stored.map(({ projectId: _projectId, ...photo }) => photo) };
}

export async function deleteProject(projectId: string): Promise<void> {
  await db.transaction('rw', db.projects, db.photos, async () => {
    await db.photos.where('projectId').equals(projectId).delete();
    await db.projects.delete(projectId);
  });
}

export function storageErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'QuotaExceededError' || /quota|space/i.test(String(error))) {
    return '浏览器本地存储空间不足。请删除旧项目，或减少一次导入的照片数量。';
  }
  return '项目保存失败，请保持页面开启并检查浏览器存储权限。';
}
