import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { PhotoItem } from '../types/photo';
import { PhotoCard } from './PhotoCard';

interface PhotoGridProps {
  photos: PhotoItem[];
  selectedIds?: Set<string>;
  onOpen: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  onToggleFinal?: (id: string) => void;
}

export function PhotoGrid({ photos, selectedIds, onOpen, onToggleSelect, onToggleFinal }: PhotoGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const columns = Math.max(2, Math.min(7, Math.floor(width / 220)));
  const rows = Math.ceil(photos.length / columns);
  const virtualizer = useVirtualizer({ count: rows, getScrollElement: () => parentRef.current, estimateSize: () => 210, overscan: 2 });
  const virtualRows = virtualizer.getVirtualItems();
  const getPhoto = useCallback((row: number, column: number) => photos[row * columns + column], [columns, photos]);
  const style = useMemo(() => ({ height: `${virtualizer.getTotalSize()}px` }), [virtualizer]);
  if (!photos.length) return <div className="empty-state"><strong>当前筛选条件下没有照片</strong><span>尝试切换分类或清除文件名搜索。</span></div>;
  return (
    <div ref={parentRef} className="virtual-grid-scroll" data-testid="photo-grid">
      <div className="virtual-grid-inner" style={style}>
        {virtualRows.map((virtualRow) => (
          <div key={virtualRow.key} className="virtual-grid-row" style={{ transform: `translateY(${virtualRow.start}px)`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: columns }, (_, column) => {
              const photo = getPhoto(virtualRow.index, column);
              return photo ? <PhotoCard key={photo.id} photo={photo} selected={selectedIds?.has(photo.id)} onOpen={onOpen} onToggleSelect={onToggleSelect} onToggleFinal={onToggleFinal} /> : <div key={`empty-${column}`} />;
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
