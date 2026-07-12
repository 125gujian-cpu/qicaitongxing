import { beforeEach, describe, expect, it } from 'vitest';
import { photoStoreApi } from '../stores/photoStore';
import type { PhotoItem, ProjectInfo } from '../types/photo';

const project: ProjectInfo = { id: 'p', name: '测试项目', createdAt: 1, updatedAt: 1, photoCount: 3 };
const makePhoto = (id: string, index: number): PhotoItem => ({ id, originalName: `${id}.jpg`, originalPath: `${id}.jpg`, extension: 'jpg', renamedName: null, status: 'unclassified', originalBlob: new Blob([id]), importedIndex: index, finalSelected: false });

beforeEach(() => {
  photoStoreApi.setState({ project: null, photos: [], step: 'import', selectedIds: new Set(), undoStack: [], redoStack: [], isDirty: false });
  photoStoreApi.getState().setProject(project, [makePhoto('a', 0), makePhoto('b', 1), makePhoto('c', 2)]);
});

describe('分类历史', () => {
  it('修改单张状态，并支持撤回与重做', () => {
    const store = photoStoreApi.getState();
    store.changeStatus(['a'], 'good');
    expect(photoStoreApi.getState().photos[0].status).toBe('good');
    photoStoreApi.getState().undo();
    expect(photoStoreApi.getState().photos[0].status).toBe('unclassified');
    photoStoreApi.getState().redo();
    expect(photoStoreApi.getState().photos[0].status).toBe('good');
  });
  it('批量状态修改作为一个整体撤回', () => {
    photoStoreApi.getState().changeStatus(['a', 'b'], 'reject');
    expect(photoStoreApi.getState().undoStack).toHaveLength(1);
    photoStoreApi.getState().undo();
    expect(photoStoreApi.getState().photos.map((photo) => photo.status)).toEqual(['unclassified', 'unclassified', 'unclassified']);
  });
});

describe('最终选片', () => {
  it('加入最终选片并调整顺序', () => {
    photoStoreApi.getState().toggleFinal(['a', 'b', 'c'], true);
    photoStoreApi.getState().reorderFinal(['c', 'a', 'b']);
    const ordered = photoStoreApi.getState().photos.filter((photo) => photo.finalSelected).sort((a, b) => (a.finalOrder ?? 0) - (b.finalOrder ?? 0));
    expect(ordered.map((photo) => photo.id)).toEqual(['c', 'a', 'b']);
    photoStoreApi.getState().undo();
    const restored = photoStoreApi.getState().photos.filter((photo) => photo.finalSelected).sort((a, b) => (a.finalOrder ?? 0) - (b.finalOrder ?? 0));
    expect(restored.map((photo) => photo.id)).toEqual(['a', 'b', 'c']);
  });
  it('移除照片时保留其余照片的拖动顺序', () => {
    photoStoreApi.getState().toggleFinal(['a', 'b', 'c'], true);
    photoStoreApi.getState().reorderFinal(['c', 'a', 'b']);
    photoStoreApi.getState().toggleFinal(['a'], false);
    const ordered = photoStoreApi.getState().photos.filter((photo) => photo.finalSelected).sort((a, b) => (a.finalOrder ?? 0) - (b.finalOrder ?? 0));
    expect(ordered.map((photo) => photo.id)).toEqual(['c', 'b']);
  });
});

describe('改名历史', () => {
  it('批量改名可以整体撤回', () => {
    photoStoreApi.getState().renamePhotos(new Map([['a', '01.jpg'], ['b', '02.jpg']]), true);
    photoStoreApi.getState().undo();
    expect(photoStoreApi.getState().photos.slice(0, 2).map((photo) => photo.renamedName)).toEqual([null, null]);
  });
});
