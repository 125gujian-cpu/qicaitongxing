import { useMemo, useState } from 'react';
import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, ListOrdered, Plus, Star, Trash2 } from 'lucide-react';
import { PhotoGrid } from '../components/PhotoGrid';
import { PhotoViewer } from '../components/PhotoViewer';
import { SortablePhoto } from '../components/SortablePhoto';
import { usePhotoStore } from '../stores/photoStore';
import type { PhotoStatus } from '../types/photo';

export function FinalSelectionPage() {
  const photos = usePhotoStore((state) => state.photos);
  const toggleFinal = usePhotoStore((state) => state.toggleFinal);
  const reorderFinal = usePhotoStore((state) => state.reorderFinal);
  const setStep = usePhotoStore((state) => state.setStep);
  const [filter, setFilter] = useState<'all' | PhotoStatus>('all');
  const [viewerId, setViewerId] = useState<string | null>(null);
  const candidates = useMemo(() => photos.filter((photo) => (photo.status === 'good' || photo.status === 'maybe') && (filter === 'all' || photo.status === filter)), [filter, photos]);
  const selected = useMemo(() => photos.filter((photo) => photo.finalSelected).sort((a, b) => (a.finalOrder ?? Infinity) - (b.finalOrder ?? Infinity)), [photos]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = selected.findIndex((photo) => photo.id === active.id);
    const to = selected.findIndex((photo) => photo.id === over.id);
    reorderFinal(arrayMove(selected, from, to).map((photo) => photo.id));
  };
  const difference = selected.length - 20;
  return (
    <main className="workspace-page final-page">
      <div className="final-heading"><div><button className="back-link" onClick={() => setStep('screen')}><ArrowLeft size={16} />返回筛选</button><h1>最终选片</h1><p>从好片与待保留中挑选，右侧拖动决定最终编号和导出顺序。</p></div><div className="final-count"><span>最终已选</span><strong>{selected.length}</strong><span>张</span></div><button className="button primary" disabled={!selected.length} onClick={() => setStep('rename')}>改名与导出<ArrowRight size={17} /></button></div>
      <div className={`count-guidance ${selected.length === 20 ? 'exact' : ''}`}>{selected.length === 20 ? <><CheckCircle2 />已选满建议的 20 张照片。</> : <><AlertCircle />当前选择了 {selected.length} 张照片，与建议的 20 张不一致（{difference < 0 ? `还差 ${Math.abs(difference)} 张` : `超出 ${difference} 张`}），仍可继续导出。</>}</div>
      <div className="final-tools"><div className="segmented"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>好片 + 待保留</button><button className={filter === 'good' ? 'active' : ''} onClick={() => setFilter('good')}>只看好片</button><button className={filter === 'maybe' ? 'active' : ''} onClick={() => setFilter('maybe')}>只看待保留</button></div><button className="button compact status-good" onClick={() => toggleFinal(photos.filter((photo) => photo.status === 'good' && !photo.finalSelected).map((photo) => photo.id), true)}><Star size={15} />将全部好片加入</button><button className="button compact secondary" onClick={() => toggleFinal(selected.map((photo) => photo.id), false)} disabled={!selected.length}><Trash2 size={15} />清空最终选片</button></div>
      <div className="final-layout">
        <section className="candidate-panel"><div className="panel-title"><div><h2>候选照片</h2><span>{candidates.length} 张</span></div><p><Plus size={14} />点击卡片下方按钮加入或移出最终选片</p></div><PhotoGrid photos={candidates} onOpen={setViewerId} onToggleFinal={(id) => toggleFinal([id])} /></section>
        <aside className="selected-panel"><div className="panel-title"><div><h2>最终顺序</h2><span>{selected.length} 张</span></div><p><ListOrdered size={14} />拖动调整导出顺序</p></div>
          {selected.length ? <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={selected.map((photo) => photo.id)} strategy={verticalListSortingStrategy}><div className="sortable-list">{selected.map((photo) => <SortablePhoto key={photo.id} photo={photo} onRemove={(id) => toggleFinal([id], false)} onOpen={setViewerId} />)}</div></SortableContext></DndContext> : <div className="selected-empty"><Plus /><strong>还没有最终选片</strong><span>从左侧好片和待保留中选择</span></div>}
        </aside>
      </div>
      {viewerId ? <PhotoViewer photos={candidates.length ? candidates : photos} activeId={viewerId} onChangeActive={setViewerId} onClose={() => setViewerId(null)} /> : null}
    </main>
  );
}
