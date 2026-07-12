import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { classifiedExportPaths, exportFinalPhotos, finalExportPath } from '../services/exportService';
import type { PhotoItem } from '../types/photo';

const photo = (partial: Partial<PhotoItem> & Pick<PhotoItem, 'id' | 'originalName'>): PhotoItem => {
  const { id, originalName, ...rest } = partial;
  return { id, originalName, originalPath: originalName, extension: 'jpg', renamedName: null,
    status: 'unclassified', originalBlob: new Blob([`original-${id}`]), importedIndex: 0, finalSelected: false, ...rest };
};

describe('ZIP 路径生成', () => {
  it('最终选片使用新名称和原扩展名', () => {
    expect(finalExportPath(photo({ id: 'a', originalName: 'DSC_01.jpg', renamedName: '课堂互动.png' }))).toBe('课堂互动.jpg');
  });
  it('分类目录中自动处理同名图片', () => {
    const paths = classifiedExportPaths([photo({ id: 'a', originalName: '同名.jpg', status: 'good' }), photo({ id: 'b', originalName: '同名.jpg', status: 'good' })]);
    expect(paths).toEqual(['好片/同名.jpg', '好片/同名_2.jpg']);
  });
  it('最终导出写入原始 Blob 且遵循最终顺序', async () => {
    const blob = await exportFinalPhotos([
      photo({ id: 'b', originalName: 'b.jpg', renamedName: '02.jpg', finalSelected: true, finalOrder: 1 }),
      photo({ id: 'a', originalName: 'a.jpg', renamedName: '01.jpg', finalSelected: true, finalOrder: 0 }),
    ]);
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files)).toEqual(['01.jpg', '02.jpg']);
    await expect(zip.file('01.jpg')!.async('string')).resolves.toBe('original-a');
  });
});
