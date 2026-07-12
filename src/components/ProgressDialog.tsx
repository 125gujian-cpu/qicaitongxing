import { LoaderCircle, X } from 'lucide-react';

interface ProgressDialogProps {
  open: boolean;
  title: string;
  currentFile?: string;
  current?: number;
  total?: number;
  percent: number;
  cancelable?: boolean;
  onCancel?: () => void;
}

export function ProgressDialog({ open, title, currentFile, current, total, percent, cancelable, onCancel }: ProgressDialogProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="progress-dialog" role="dialog" aria-modal="true" aria-live="polite">
        <div className="progress-title"><LoaderCircle className="spin" size={20} /><h2>{title}</h2></div>
        <p className="progress-file" title={currentFile}>{currentFile || '正在准备…'}</p>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div>
        <div className="progress-meta"><span>{current !== undefined && total !== undefined ? `${current} / ${total}` : '本机处理中'}</span><strong>{Math.round(percent)}%</strong></div>
        {cancelable ? <button className="button secondary full" onClick={onCancel}><X size={16} />取消操作</button> : null}
      </div>
    </div>
  );
}
