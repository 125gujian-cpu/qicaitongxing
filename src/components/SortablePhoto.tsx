import { CSS } from '@dnd-kit/utilities';
import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, X } from 'lucide-react';
import type { PhotoItem } from '../types/photo';
import { useObjectUrl } from '../hooks/useObjectUrl';

export function SortablePhoto({ photo, onRemove, onOpen }: { photo: PhotoItem; onRemove: (id: string) => void; onOpen: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const url = useObjectUrl(photo.thumbnailBlob ?? photo.originalBlob);
  return (
    <article ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`sortable-photo ${isDragging ? 'dragging' : ''}`}>
      <button className="drag-handle" {...attributes} {...listeners} aria-label="拖动排序"><GripVertical /></button>
      <span className="order-number">{(photo.finalOrder ?? 0) + 1}</span>
      <button className="sortable-thumb" onClick={() => onOpen(photo.id)}>{url ? <img src={url} alt="" /> : null}</button>
      <div><strong title={photo.renamedName ?? photo.originalName}>{photo.renamedName ?? photo.originalName}</strong><span>{photo.width} × {photo.height} · {photo.extension.toUpperCase()}</span></div>
      <button className="icon-button remove-final" onClick={() => onRemove(photo.id)} aria-label="移出最终选片"><X /></button>
    </article>
  );
}
