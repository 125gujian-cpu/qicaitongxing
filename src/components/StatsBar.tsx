import type { PhotoItem } from '../types/photo';

export function StatsBar({ photos }: { photos: PhotoItem[] }) {
  const count = (status: PhotoItem['status']) => photos.filter((photo) => photo.status === status).length;
  const items = [
    ['总计', photos.length, 'total'], ['未分类', count('unclassified'), 'unclassified'], ['好片', count('good'), 'good'],
    ['待保留', count('maybe'), 'maybe'], ['废片', count('reject'), 'reject'], ['最终选择', photos.filter((photo) => photo.finalSelected).length, 'final'],
  ] as const;
  return <div className="stats-bar">{items.map(([label, value, key]) => <div key={key} className={`stat ${key}`}><span>{label}</span><strong>{value}</strong></div>)}</div>;
}
