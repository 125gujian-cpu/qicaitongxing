import { Check, HardDrive, Image, Redo2, Undo2 } from 'lucide-react';
import type { AppStep, ProjectInfo } from '../types/photo';
import { usePhotoStore } from '../stores/photoStore';

const STEPS: { id: AppStep; label: string; number: number }[] = [
  { id: 'import', label: '导入照片', number: 1 },
  { id: 'screen', label: '筛选照片', number: 2 },
  { id: 'final', label: '最终选片', number: 3 },
  { id: 'rename', label: '改名与导出', number: 4 },
];

interface AppHeaderProps { project: ProjectInfo | null; step: AppStep; onNavigate: (step: AppStep) => void; }

export function AppHeader({ project, step, onNavigate }: AppHeaderProps) {
  const undoCount = usePhotoStore((state) => state.undoStack.length);
  const redoCount = usePhotoStore((state) => state.redoStack.length);
  const undo = usePhotoStore((state) => state.undo);
  const redo = usePhotoStore((state) => state.redo);
  const dirty = usePhotoStore((state) => state.isDirty);
  return (
    <header className="app-header">
      <div className="brand-row">
        <div className="brand"><span className="brand-mark"><Image size={20} /></span><span>拾光筛片</span></div>
        <div className="project-title" title={project?.name}>{project?.name || '本地图片筛选与导出工具'}</div>
        <div className="header-spacer" />
        <span className="local-badge"><HardDrive size={14} />全部在本机处理</span>
        {project ? <span className={`save-state ${dirty ? 'saving' : ''}`}><Check size={14} />{dirty ? '正在保存' : '已自动保存'}</span> : null}
        <div className="history-controls">
          <button className="icon-button" onClick={undo} disabled={!undoCount} aria-label="撤回" title="撤回 Ctrl/Cmd + Z"><Undo2 size={17} /></button>
          <button className="icon-button" onClick={redo} disabled={!redoCount} aria-label="重做" title="重做 Ctrl/Cmd + Shift + Z"><Redo2 size={17} /></button>
        </div>
      </div>
      <nav className="step-nav" aria-label="工作流程">
        {STEPS.map((item) => {
          const disabled = !project && item.id !== 'import';
          const active = item.id === step;
          const currentIndex = STEPS.findIndex((candidate) => candidate.id === step);
          const done = STEPS.findIndex((candidate) => candidate.id === item.id) < currentIndex;
          return <button key={item.id} disabled={disabled} onClick={() => onNavigate(item.id)} className={`${active ? 'active' : ''} ${done ? 'done' : ''}`}><span>{done ? <Check size={14} /> : item.number}</span>{item.label}</button>;
        })}
      </nav>
    </header>
  );
}
