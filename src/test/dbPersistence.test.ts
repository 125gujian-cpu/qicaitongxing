// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { db, deleteProject, getLatestProject, persistProject } from '../db/database';
import type { PhotoItem, ProjectInfo } from '../types/photo';

beforeEach(async () => {
  await db.photos.clear();
  await db.projects.clear();
});

describe('IndexedDB 项目恢复', () => {
  it('完整保存和恢复原图 Blob、缩略图与编辑状态', async () => {
    const project: ProjectInfo = { id: 'restore-project', name: '惠州学院2026三下乡', createdAt: 1, updatedAt: 2, photoCount: 1 };
    const photo: PhotoItem = { id: 'restore-photo', originalName: '课堂.jpg', originalPath: '第一天/课堂.jpg', extension: 'jpg', renamedName: '支教课堂_01.jpg', status: 'good', originalBlob: new Blob(['original']), thumbnailBlob: new Blob(['thumb']), width: 4000, height: 3000, importedIndex: 0, finalSelected: true, finalOrder: 0 };
    await persistProject(project, [photo]);
    const restored = await getLatestProject();
    expect(restored?.project.name).toBe(project.name);
    expect(restored?.photos[0]).toMatchObject({ status: 'good', renamedName: '支教课堂_01.jpg', finalSelected: true, originalPath: '第一天/课堂.jpg' });
    expect(await restored?.photos[0].originalBlob.text()).toBe('original');
    expect(await restored?.photos[0].thumbnailBlob?.text()).toBe('thumb');
    await deleteProject(project.id);
    expect(await getLatestProject()).toBeNull();
  });
});
