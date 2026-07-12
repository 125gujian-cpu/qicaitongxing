import { useMemo, useState } from 'react';
import { AlertCircle, Archive, CheckCircle2, Download, FolderTree, Images, LoaderCircle } from 'lucide-react';
import { downloadBlob, exportClassifiedPhotos, exportFinalPhotos } from '../services/exportService';
import { safeZipName, validatePhotoNames } from '../services/filenameService';
import type { PhotoItem, ProjectInfo } from '../types/photo';

interface ExportPanelProps { project: ProjectInfo; allPhotos: PhotoItem[]; finalPhotos: PhotoItem[]; }

export function ExportPanel({ project, allPhotos, finalPhotos }: ExportPanelProps) {
  const [zipName, setZipName] = useState(project.name);
  const [exporting, setExporting] = useState<'final' | 'classified' | null>(null);
  const [progress, setProgress] = useState({ percent: 0, file: '' });
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const validation = useMemo(() => validatePhotoNames(finalPhotos), [finalPhotos]);
  const run = async (type: 'final' | 'classified') => {
    if (exporting) return;
    if (type === 'final' && !finalPhotos.length) { setMessage({ type: 'error', text: '最终选片为空，请先选择照片。' }); return; }
    if (type === 'final' && !validation.valid) { setMessage({ type: 'error', text: '存在空名称、非法名称或重名，请先修正再导出。' }); return; }
    setExporting(type); setProgress({ percent: 0, file: '' }); setMessage(null);
    try {
      const onProgress = (value: { percent: number; currentFile: string }) => setProgress({ percent: value.percent, file: value.currentFile });
      const blob = type === 'final' ? await exportFinalPhotos(finalPhotos, onProgress) : await exportClassifiedPhotos(allPhotos, onProgress);
      const suffix = type === 'final' ? '最终选片' : '筛选结果';
      downloadBlob(blob, safeZipName(`${zipName}_${suffix}`, `${project.name}_${suffix}`));
      setMessage({ type: 'success', text: `${suffix} ZIP 已生成，原图质量与格式保持不变。` });
    } catch (error) { setMessage({ type: 'error', text: `导出失败：${error instanceof Error ? error.message : '浏览器无法生成 ZIP'}` }); }
    finally { setExporting(null); }
  };
  return (
    <section className="export-panel">
      <div className="export-title"><div><h2>导出 ZIP</h2><p>压缩包在当前浏览器中生成，不会上传任何图片。</p></div><Archive /></div>
      <label className="field-label">ZIP 文件名<input value={zipName} onChange={(event) => setZipName(event.target.value)} maxLength={100} /></label>
      <div className="export-options">
        <button onClick={() => void run('final')} disabled={!!exporting || !finalPhotos.length} className="export-option primary-option"><span className="export-icon"><Images /></span><span><strong>只导出最终选片</strong><small>{finalPhotos.length} 张 · 按最终顺序 · 使用新文件名</small></span><Download /></button>
        <button onClick={() => void run('classified')} disabled={!!exporting || !allPhotos.length} className="export-option"><span className="export-icon"><FolderTree /></span><span><strong>按分类导出全部</strong><small>{allPhotos.length} 张 · 好片 / 待保留 / 废片 / 未分类</small></span><Download /></button>
      </div>
      {exporting ? <div className="inline-progress"><div><LoaderCircle className="spin" /><span title={progress.file}>{progress.file || '准备压缩…'}</span><strong>{Math.round(progress.percent)}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress.percent}%` }} /></div></div> : null}
      {message ? <div className={`notice ${message.type}`}>{message.type === 'error' ? <AlertCircle /> : <CheckCircle2 />}{message.text}</div> : null}
      <div className="quality-note"><CheckCircle2 /><span><strong>原图无损导出</strong>预览缩略图不会进入压缩包；ZIP 中写入的是最初导入的原始 Blob。</span></div>
    </section>
  );
}
