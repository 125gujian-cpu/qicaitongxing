import { describe, expect, it } from 'vitest';
import { buildBatchNames, ensureExtension, getExtension, isSupportedImage, resolveDuplicateNames, sanitizeFilenameBase, validatePhotoNames } from '../services/filenameService';

describe('文件扩展名识别', () => {
  it('识别受支持的大小写扩展名', () => {
    expect(getExtension('活动照片.JPEG')).toBe('jpeg');
    expect(isSupportedImage('folder/中文图片.WebP')).toBe(true);
    expect(isSupportedImage('说明.txt')).toBe(false);
  });
});

describe('文件名处理', () => {
  it('清理 Windows 非法字符、首尾空格并保留中文', () => {
    expect(sanitizeFilenameBase('  禁毒<课堂>:互动?.jpg  ')).toBe('禁毒_课堂_互动_');
  });
  it('自动去掉用户输入的旧扩展名并保留目标扩展名', () => {
    expect(ensureExtension('禁毒课堂互动.PNG', 'jpg')).toBe('禁毒课堂互动.jpg');
  });
  it('按设置批量编号', () => {
    const names = buildBatchNames([{ extension: 'jpg' }, { extension: 'png' }], { prefix: '三下乡_支教课堂', start: 1, digits: 2, separator: '_' });
    expect(names).toEqual(['三下乡_支教课堂_01.jpg', '三下乡_支教课堂_02.png']);
  });
  it('按不区分大小写检测重名，并可自动追加序号', () => {
    const photos = [
      { id: 'a', renamedName: '课堂.JPG', originalName: 'a.jpg', extension: 'jpg' },
      { id: 'b', renamedName: '课堂.jpg', originalName: 'b.jpg', extension: 'jpg' },
    ];
    expect(validatePhotoNames(photos).duplicateIds).toEqual(['a', 'b']);
    expect([...resolveDuplicateNames(photos).values()]).toEqual(['课堂.jpg', '课堂_2.jpg']);
  });
});
