import { memo } from 'react';
import { Check, Flag, ImageOff } from 'lucide-react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { STATUS_META, type PhotoItem } from '../types/photo';

interface PhotoCardProps {
  photo: PhotoItem;
  selected?: boolean;
  onOpen: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  onToggleFinal?: (id: string) => void;
}

export const PhotoCard = memo(function PhotoCard({ photo, selected, onOpen, onToggleSelect, onToggleFinal }: PhotoCardProps) {
  const url = useObjectUrl(photo.thumbnailBlob ?? photo.originalBlob);
  return (
    <article className={`photo-card status-${photo.status} ${selected ? 'selected' : ''}`}>
      <button className="photo-preview" onClick={() => onOpen(photo.id)} aria-label={`查看 ${photo.originalName}`}>
        {url ? <img src={url} alt="" loading="lazy" decoding="async" /> : <ImageOff />}
        <span className="photo-index">#{String(photo.importedIndex + 1).padStart(3, '0')}</span>
        {photo.finalSelected ? <span className="final-flag"><Flag size={12} fill="currentColor" />最终</span> : null}
      </button>
      <div className="photo-card-info">
        {onToggleSelect ? <label className="select-check"><input type="checkbox" checked={selected} onChange={() => onToggleSelect(photo.id)} /><span><Check size={12} /></span></label> : null}
        <button className="filename-button" onClick={() => onOpen(photo.id)} title={photo.originalName}>{photo.originalName}</button>
        <span className={`status-label ${photo.status}`}>{STATUS_META[photo.status].label}</span>
        {onToggleFinal ? <button className={`mini-final ${photo.finalSelected ? 'active' : ''}`} onClick={() => onToggleFinal(photo.id)}>{photo.finalSelected ? '移出最终' : '加入最终'}</button> : null}
      </div>
    </article>
  );
});
