import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { readZipFile } from '../services/zipService';

describe('10 张图片 ZIP 导入', () => {
  it('读取嵌套中文路径并忽略非图片与 macOS 隐藏文件', async () => {
    const zip = new JSZip();
    for (let index = 1; index <= 10; index++) zip.file(`支教课堂/活动照片_${index}.jpg`, `raw-${index}`);
    zip.file('说明.txt', 'ignore');
    zip.file('__MACOSX/._活动照片_1.jpg', 'ignore');
    const bytes = await zip.generateAsync({ type: 'uint8array' });
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const file = new File([copy.buffer], '十张照片.zip', { type: 'application/zip' });
    const updates: string[] = [];
    const result = await readZipFile(file, undefined, (_current, _total, name) => updates.push(name));
    expect(result.images).toHaveLength(10);
    expect(result.images[0].path).toBe('支教课堂/活动照片_1.jpg');
    expect(result.ignoredCount).toBe(1);
    expect(updates.at(-1)).toBe('支教课堂/活动照片_10.jpg');
  });
});
