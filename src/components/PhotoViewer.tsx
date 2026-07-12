import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, RotateCcw, RotateCw, Star, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { usePhotoStore } from '../stores/photoStore';
import { STATUS_META, type PhotoItem, type PhotoStatus } from '../types/photo';

interface PhotoViewerProps {
  photos: PhotoItem[];
  activeId: string;
  screening?: boolean;
  onChangeActive: (id: string) => void;
  onClose: () => void;
}

export function PhotoViewer({ photos, activeId, screening = false, onChangeActive, onClose }: PhotoViewerProps) {
  const photo = photos.find((item) => item.id === activeId) ?? photos[0];
  const index = photos.findIndex((item) => item.id === photo?.id);
  const url = useObjectUrl(photo?.originalBlob);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const changeStatus = usePhotoStore((state) => state.changeStatus);
  const undo = usePhotoStore((state) => state.undo);
  const redo = usePhotoStore((state) => state.redo);

  useEffect(() => { setScale(1); setPosition({ x: 0, y: 0 }); setRotation(0); }, [photo?.id]);

  const go = useCallback((direction: number) => {
    if (!photos.length) return;
    const next = Math.max(0, Math.min(photos.length - 1, index + direction));
    onChangeActive(photos[next].id);
  }, [index, onChangeActive, photos]);

  const classify = useCallback((status: PhotoStatus) => {
    if (!photo) return;
    changeStatus([photo.id], status);
    if (screening) {
      const currentIndex = photos.findIndex((item) => item.id === photo.id);
      const nextUnclassified = photos.find((item, itemIndex) => itemIndex > currentIndex && item.status === 'unclassified')
        ?? photos.find((item) => item.status === 'unclassified' && item.id !== photo.id)
        ?? photos[Math.min(currentIndex + 1, photos.length - 1)];
      if (nextUnclassified) onChangeActive(nextUnclassified.id);
    }
  }, [changeStatus, onChangeActive, photo, photos, screening]);

  const handlers = useMemo(() => ({
    reject: screening ? () => classify('reject') : undefined,
    maybe: screening ? () => classify('maybe') : undefined,
    good: screening ? () => classify('good') : undefined,
    previous: () => go(-1), next: () => go(1), undo, redo,
    toggleZoom: () => setScale((value) => value === 1 ? 2 : 1), escape: onClose,
  }), [classify, go, onClose, redo, screening, undo]);
  useKeyboardShortcuts(handlers);

  if (!photo) return null;
  return (
    <div className="viewer-backdrop" role="dialog" aria-modal="true" aria-label="照片查看器">
      <div className="viewer-header">
        <div><strong>{photo.originalName}</strong><span>{index + 1} / {photos.length} · {photo.width && photo.height ? `${photo.width} × ${photo.height}` : '原图预览'}</span></div>
        <span className={`status-label ${photo.status}`}>{STATUS_META[photo.status].label}</span>
        <div className="viewer-tools">
          <button onClick={() => setScale((value) => Math.max(.5, value - .25))} aria-label="缩小"><ZoomOut /></button>
          <span>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((value) => Math.min(5, value + .25))} aria-label="放大"><ZoomIn /></button>
          <button onClick={() => { setScale(1); setPosition({ x: 0, y: 0 }); }} aria-label="适应窗口" title="适应窗口/原图比例"><Maximize2 /></button>
          <button onClick={() => setRotation((value) => value - 90)} aria-label="逆时针旋转"><RotateCcw /></button>
          <button onClick={() => setRotation((value) => value + 90)} aria-label="顺时针旋转"><RotateCw /></button>
          <button onClick={onClose} aria-label="关闭"><X /></button>
        </div>
      </div>
      <button className="viewer-arrow left" onClick={() => go(-1)} disabled={index <= 0} aria-label="上一张"><ChevronLeft /></button>
      <div className={`viewer-canvas ${scale > 1 ? 'zoomed' : ''}`}
        onWheel={(event) => { event.preventDefault(); setScale((value) => Math.max(.5, Math.min(5, value + (event.deltaY < 0 ? .2 : -.2)))); }}
        onPointerDown={(event) => { if (scale > 1) { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { x: event.clientX, y: event.clientY, startX: position.x, startY: position.y }; } }}
        onPointerMove={(event) => { const drag = dragRef.current; if (drag) setPosition({ x: drag.startX + event.clientX - drag.x, y: drag.startY + event.clientY - drag.y }); }}
        onPointerUp={() => { dragRef.current = null; }}>
        {url ? <img src={url} alt={photo.originalName} draggable={false} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)` }} /> : null}
      </div>
      <button className="viewer-arrow right" onClick={() => go(1)} disabled={index >= photos.length - 1} aria-label="下一张"><ChevronRight /></button>
      {screening ? <div className="viewer-classify">
        <button className="reject" onClick={() => classify('reject')}><Trash2 size={18} /><span>废片</span><kbd>1</kbd></button>
        <button className="maybe" onClick={() => classify('maybe')}><span className="maybe-icon">◇</span><span>待保留</span><kbd>2</kbd></button>
        <button className="good" onClick={() => classify('good')}><Star size={18} /><span>好片</span><kbd>3</kbd></button>
      </div> : null}
      <div className="viewer-hints">← → 切换 · 滚轮缩放 · 拖动查看 · 空格切换比例 · Esc 关闭 · Ctrl/Cmd + Z 撤回</div>
    </div>
  );
}
