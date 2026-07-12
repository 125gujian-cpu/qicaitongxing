import { useMemo, useState } from 'react';
import { ArrowRight, Grid2X2, Image, Keyboard, Maximize2 } from 'lucide-react';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoViewer } from '../components/PhotoViewer';
import { StatsBar } from '../components/StatsBar';
import { StatusToolbar, type SortMode, type StatusFilter } from '../components/StatusToolbar';
import { usePhotoStore } from '../stores/photoStore';
import type { PhotoStatus } from '../types/photo';

export function ScreeningPage() {
  const photos = usePhotoStore((state) => state.photos);
  const selectedIds = usePhotoStore((state) => state.selectedIds);
  const toggleSelected = usePhotoStore((state) => state.toggleSelected);
  const setSelectedIds = usePhotoStore((state) => state.setSelectedIds);
  const changeStatus = usePhotoStore((state) => state.changeStatus);
  const setStep = usePhotoStore((state) => state.setStep);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortMode>('import-asc');
  const [search, setSearch] = useState('');
  const [viewerId, setViewerId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('zh-CN');
    const result = photos.filter((photo) => (filter === 'all' || photo.status === filter) && (!query || photo.originalName.toLocaleLowerCase('zh-CN').includes(query)));
    if (sort === 'name-asc') return [...result].sort((a, b) => a.originalName.localeCompare(b.originalName, 'zh-CN', { numeric: true }));
    if (sort === 'name-desc') return [...result].sort((a, b) => b.originalName.localeCompare(a.originalName, 'zh-CN', { numeric: true }));
    return result;
  }, [filter, photos, search, sort]);

  const batch = (status: PhotoStatus) => changeStatus([...selectedIds], status);
  return (
    <main className="workspace-page screening-page">
      <StatsBar photos={photos} />
      <div className="workspace-heading"><div><h1>筛选照片</h1><p>在网格中批量整理，或打开任意照片使用 1 / 2 / 3 快速判断。</p></div><div className="view-switch"><button className="active"><Grid2X2 size={16} />网格模式</button><button onClick={() => setViewerId(filtered.find((photo) => photo.status === 'unclassified')?.id ?? filtered[0]?.id)}><Image size={16} />单图模式</button></div><button className="button primary" onClick={() => setStep('final')}>进入最终选片<ArrowRight size={17} /></button></div>
      <StatusToolbar filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} search={search} setSearch={setSearch} selectedCount={selectedIds.size} onSelectAll={() => setSelectedIds(new Set(filtered.map((photo) => photo.id)))} onClearSelection={() => setSelectedIds(new Set())} onBatch={batch} />
      <section className="grid-shell"><PhotoGrid photos={filtered} selectedIds={selectedIds} onOpen={setViewerId} onToggleSelect={toggleSelected} /></section>
      <div className="shortcut-bar"><Keyboard size={15} /><span><kbd>1</kbd> 废片</span><span><kbd>2</kbd> 待保留</span><span><kbd>3</kbd> 好片</span><span><kbd>← →</kbd> 切换</span><span><kbd>Ctrl/⌘ Z</kbd> 撤回</span><span><Maximize2 size={14} />大图支持缩放、拖动与旋转</span></div>
      {viewerId ? <PhotoViewer photos={filtered.length ? filtered : photos} activeId={viewerId} screening onChangeActive={setViewerId} onClose={() => setViewerId(null)} /> : null}
    </main>
  );
}
