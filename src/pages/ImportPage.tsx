import { useRef, useState } from 'react';
import { Archive, Clock3, FileImage, FolderOpen, HardDrive, ImagePlus, RotateCcw, ShieldCheck, Trash2, UploadCloud } from 'lucide-react';
import type { ProjectInfo, PhotoItem } from '../types/photo';
import { createThumbnail } from '../services/thumbnailService';
import { readImageFiles, readZipFile, type ImportSource } from '../services/zipService';
import { deleteProject, getLatestProject, persistProject, storageErrorMessage } from '../db/database';
import { usePhotoStore } from '../stores/photoStore';
import { ProgressDialog } from '../components/ProgressDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface ImportPageProps { recentProject: ProjectInfo | null; onRecentChanged: () => void; }

interface ImportProgress { open: boolean; current: number; total: number; percent: number; file: string; }

export function ImportPage({ recentProject, onRecentChanged }: ImportPageProps) {
  const [projectName, setProjectName] = useState('惠州学院2026三下乡');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<ImportProgress>({ open: false, current: 0, total: 0, percent: 0, file: '' });
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const setProject = usePhotoStore((state) => state.setProject);
  const currentProject = usePhotoStore((state) => state.project);
  const clearProject = usePhotoStore((state) => state.clearProject);
  const markSaved = usePhotoStore((state) => state.markSaved);

  const processSources = async (sources: ImportSource[], ignoredCount: number) => {
    const controller = new AbortController(); abortRef.current = controller;
    setProgress({ open: true, current: 0, total: sources.length, percent: 0, file: '准备生成缩略图…' });
    const photos: PhotoItem[] = [];
    let decodeFailed = 0;
    for (let index = 0; index < sources.length; index++) {
      if (controller.signal.aborted) throw new DOMException('导入已取消', 'AbortError');
      const source = sources[index];
      setProgress({ open: true, current: index, total: sources.length, percent: index / sources.length * 100, file: source.path });
      try {
        const thumbnail = await createThumbnail(source.blob);
        photos.push({ id: crypto.randomUUID(), originalName: source.name, originalPath: source.path, extension: source.extension, renamedName: null, status: 'unclassified', originalBlob: source.blob, thumbnailBlob: thumbnail.blob, width: thumbnail.width, height: thumbnail.height, importedIndex: index, finalSelected: false });
      } catch { decodeFailed++; }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    if (!photos.length) throw new Error('图片均无法解码，请检查文件是否损坏或格式是否真实有效');
    const project: ProjectInfo = { id: crypto.randomUUID(), name: projectName.trim() || '未命名项目', createdAt: Date.now(), updatedAt: Date.now(), photoCount: photos.length };
    if (recentProject) await deleteProject(recentProject.id);
    await persistProject(project, photos);
    setProject(project, photos, 'screen'); markSaved(); onRecentChanged();
    setNotice({ type: 'success', text: `成功导入 ${photos.length} 张图片；忽略 ${ignoredCount} 个非图片文件${decodeFailed ? `，另有 ${decodeFailed} 张无法解码` : ''}。` });
    setProgress((value) => ({ ...value, current: photos.length, percent: 100, open: false }));
  };

  const handleFiles = async (files: File[]) => {
    setNotice(null);
    if (!files.length) return;
    if (recentProject && !confirm(`当前浏览器中已有项目“${recentProject.name}”。新建项目会替换并删除旧项目的本地数据，是否继续？`)) return;
    try {
      if (files.length === 1 && (files[0].name.toLowerCase().endsWith('.zip') || files[0].type.includes('zip'))) {
        setProgress({ open: true, current: 0, total: 1, percent: 2, file: files[0].name });
        abortRef.current = new AbortController();
        const result = await readZipFile(files[0], abortRef.current.signal, (current, total, file) => setProgress({ open: true, current, total, percent: total ? current / total * 45 : 2, file: `解压：${file}` }));
        await processSources(result.images, result.ignoredCount);
      } else {
        const result = readImageFiles(files);
        if (!result.images.length) throw new Error('请选择 ZIP 文件或 JPG、JPEG、PNG、WebP 图片');
        await processSources(result.images, result.ignoredCount);
      }
    } catch (error) {
      setProgress((value) => ({ ...value, open: false }));
      if (error instanceof DOMException && error.name === 'AbortError') setNotice({ type: 'error', text: '导入已取消，未创建新项目。' });
      else if (/quota|space|storage/i.test(String(error)) || (error instanceof DOMException && error.name === 'QuotaExceededError')) setNotice({ type: 'error', text: storageErrorMessage(error) });
      else setNotice({ type: 'error', text: error instanceof Error ? error.message : storageErrorMessage(error) });
    }
  };

  const continueProject = async () => {
    try {
      setProgress({ open: true, current: 0, total: recentProject?.photoCount ?? 0, percent: 30, file: '正在从浏览器本地存储恢复项目…' });
      const data = await getLatestProject();
      if (!data) throw new Error('未找到可恢复的项目');
      setProject(data.project, data.photos, 'screen'); markSaved();
    } catch (error) { setNotice({ type: 'error', text: error instanceof Error ? error.message : '项目恢复失败' }); }
    finally { setProgress((value) => ({ ...value, open: false })); }
  };

  const doDelete = async () => {
    if (!recentProject) return;
    await deleteProject(recentProject.id);
    if (currentProject?.id === recentProject.id) clearProject();
    setConfirmDelete(false); onRecentChanged(); setNotice({ type: 'success', text: '本地项目已删除。' });
  };

  return (
    <main className="import-page">
      <section className="import-intro"><div><h1>把选片这件事，留在本机快速完成</h1><p>拖入 ZIP 或直接选择图片，分类、改名和导出全程不会上传云端。</p></div><div className="privacy-points"><span><ShieldCheck />不上传</span><span><HardDrive />本地保存</span><span><Archive />原图导出</span></div></section>
      {recentProject ? <section className="recovery-card"><div className="recovery-icon"><RotateCcw /></div><div className="recovery-copy"><span>发现未完成项目</span><strong>{recentProject.name}</strong><p><FileImage size={15} />照片数量：{recentProject.photoCount}<Clock3 size={15} />最后编辑：{new Date(recentProject.updatedAt).toLocaleString('zh-CN', { hour12: false })}</p></div><div className="recovery-actions"><button className="button primary" onClick={continueProject}>继续项目</button><button className="button secondary" onClick={() => document.getElementById('project-name')?.focus()}><ImagePlus size={16} />新建项目</button><button className="button secondary" onClick={() => setConfirmDelete(true)}><Trash2 size={16} />删除项目</button></div></section> : null}
      <section className="import-workspace">
        <label className="field-label" htmlFor="project-name">项目名称</label>
        <input id="project-name" className="project-name-input" value={projectName} onChange={(event) => setProjectName(event.target.value)} maxLength={80} />
        <div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void handleFiles([...event.dataTransfer.files]); }}>
          <div className="drop-icon"><UploadCloud size={30} /></div><h2>将 ZIP 压缩包拖到这里</h2><p>自动提取嵌套文件夹中的 JPG、JPEG、PNG 与 WebP，其他文件会被忽略</p>
          <div className="drop-actions"><button className="button primary large" onClick={() => zipInput.current?.click()}><FolderOpen size={18} />选择 ZIP 文件</button><button className="button secondary large" onClick={() => imageInput.current?.click()}><ImagePlus size={18} />选择多张图片</button></div>
          <input ref={zipInput} hidden type="file" accept=".zip,application/zip" onChange={(event) => void handleFiles([...event.target.files ?? []])} />
          <input ref={imageInput} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void handleFiles([...event.target.files ?? []])} />
        </div>
        {notice ? <div className={`notice ${notice.type}`} role="status">{notice.text}</div> : null}
        <div className="import-footnotes"><span>建议单次 100–300 张</span><span>缩略图仅用于预览</span><span>导出始终使用原图</span></div>
      </section>
      <ProgressDialog open={progress.open} title="正在导入照片" currentFile={progress.file} current={progress.current} total={progress.total} percent={progress.percent} cancelable onCancel={() => abortRef.current?.abort()} />
      <ConfirmDialog open={confirmDelete} title="删除未完成项目？" message="原图、缩略图、分类与命名记录都会从当前浏览器永久删除，此操作无法撤回。" confirmLabel="永久删除" destructive onConfirm={() => void doDelete()} onClose={() => setConfirmDelete(false)} />
    </main>
  );
}
