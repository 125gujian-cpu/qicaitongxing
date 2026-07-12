import { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, Eye, RefreshCw, WandSparkles } from 'lucide-react';
import { ExportPanel } from '../components/ExportPanel';
import { RenameRow } from '../components/RenameRow';
import { buildBatchNames, ensureExtension, resolveDuplicateNames, sanitizeFilenameBase, validatePhotoNames } from '../services/filenameService';
import { usePhotoStore } from '../stores/photoStore';

export function RenamePage() {
  const project = usePhotoStore((state) => state.project);
  const photos = usePhotoStore((state) => state.photos);
  const renamePhotos = usePhotoStore((state) => state.renamePhotos);
  const setStep = usePhotoStore((state) => state.setStep);
  const finalPhotos = useMemo(() => photos.filter((photo) => photo.finalSelected).sort((a, b) => (a.finalOrder ?? Infinity) - (b.finalOrder ?? Infinity)), [photos]);
  const [options, setOptions] = useState({ prefix: project?.name ?? '三下乡', start: 1, digits: 2, separator: '_' });
  const previews = useMemo(() => buildBatchNames(finalPhotos, options), [finalPhotos, options]);
  const validation = useMemo(() => validatePhotoNames(finalPhotos), [finalPhotos]);
  const errorMap = useMemo(() => {
    const map = new Map<string, string>();
    validation.emptyIds.forEach((id) => map.set(id, '文件名不能为空'));
    validation.invalidIds.forEach((id) => map.set(id, '名称含非法字符、保留字或长度超限'));
    validation.duplicateIds.forEach((id) => map.set(id, '与其他照片的导出文件名重复（忽略大小写）'));
    return map;
  }, [validation]);
  const applyBatch = () => renamePhotos(new Map(finalPhotos.map((photo, index) => [photo.id, previews[index]])), true);
  const resolveDuplicates = () => renamePhotos(resolveDuplicateNames(finalPhotos), true);
  if (!project) return null;
  return (
    <main className="workspace-page rename-page">
      <div className="rename-heading"><div><button className="back-link" onClick={() => setStep('final')}><ArrowLeft size={16} />返回最终选片</button><h1>改名与导出</h1><p>先确认最终顺序和文件名，再以原图质量生成 ZIP。</p></div><div className={`validation-summary ${validation.valid ? 'valid' : ''}`}>{validation.valid ? <><Check />文件名检查通过</> : <><AlertCircle />{errorMap.size} 项需要处理</>}</div></div>
      {!finalPhotos.length ? <div className="empty-state tall"><strong>最终选片为空</strong><span>返回上一步选择需要导出的照片。</span><button className="button primary" onClick={() => setStep('final')}>返回最终选片</button></div> : <div className="rename-layout">
        <div className="rename-main">
          <section className="batch-rename-panel"><div className="batch-title"><WandSparkles /><div><h2>批量命名</h2><p>先实时预览，确认后一次性应用；整次操作可撤回。</p></div></div><div className="batch-fields"><label>文件名前缀<input value={options.prefix} onChange={(event) => setOptions((value) => ({ ...value, prefix: event.target.value }))} /></label><label>起始编号<input type="number" min="0" value={options.start} onChange={(event) => setOptions((value) => ({ ...value, start: Number(event.target.value) }))} /></label><label>编号位数<input type="number" min="1" max="8" value={options.digits} onChange={(event) => setOptions((value) => ({ ...value, digits: Number(event.target.value) }))} /></label><label>分隔符<input value={options.separator} maxLength={3} onChange={(event) => setOptions((value) => ({ ...value, separator: event.target.value }))} /></label><button className="button primary" onClick={applyBatch}>应用到 {finalPhotos.length} 张</button></div><div className="batch-preview"><Eye size={15} /><span>预览</span>{previews.slice(0, 3).map((name) => <code key={name}>{name}</code>)}{previews.length > 3 ? <em>… 共 {previews.length} 个</em> : null}</div></section>
          {!validation.valid && validation.duplicateIds.length ? <div className="duplicate-warning"><AlertCircle /><span><strong>发现 {validation.duplicateIds.length} 个重名文件</strong>Windows 与 macOS 通常忽略大小写差异，导出前必须处理。</span><button className="button secondary compact" onClick={resolveDuplicates}><RefreshCw size={14} />一键自动解决重名</button></div> : null}
          <section className="rename-list"><div className="rename-list-head"><span>序号</span><span>照片与原文件名</span><span>新文件名（自动保留扩展名）</span></div>{finalPhotos.map((photo, index) => <RenameRow key={photo.id} photo={photo} index={index} error={errorMap.get(photo.id)} onChange={(value) => renamePhotos(new Map([[photo.id, value.trim() ? ensureExtension(sanitizeFilenameBase(value), photo.extension) : '']]))} />)}</section>
        </div>
        <aside><ExportPanel project={project} allPhotos={photos} finalPhotos={finalPhotos} /></aside>
      </div>}
    </main>
  );
}
