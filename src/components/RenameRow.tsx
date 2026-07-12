import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useObjectUrl } from '../hooks/useObjectUrl';
import type { PhotoItem } from '../types/photo';

export function RenameRow({ photo, index, error, onChange }: { photo: PhotoItem; index: number; error?: string; onChange: (value: string) => void }) {
  const url = useObjectUrl(photo.thumbnailBlob ?? photo.originalBlob);
  return (
    <div className={`rename-row ${error ? 'has-error' : ''}`}>
      <span className="rename-order">{String(index + 1).padStart(2, '0')}</span>
      <div className="rename-thumb">{url ? <img src={url} alt="" /> : null}</div>
      <div className="original-name"><span>原文件名</span><strong title={photo.originalName}>{photo.originalName}</strong></div>
      <div className="rename-arrow">→</div>
      <label className="rename-input"><span>导出文件名</span><div><input value={(photo.renamedName !== null ? photo.renamedName : photo.originalName).replace(new RegExp(`\\.${photo.extension}$`, 'i'), '')} onChange={(event) => onChange(event.target.value)} maxLength={180} /><em>.{photo.extension}</em>{error ? <AlertCircle /> : <CheckCircle2 />}</div>{error ? <small>{error}</small> : null}</label>
    </div>
  );
}
