import { useCallback, useEffect, useRef, useState } from 'react';
import { AppHeader } from './components/AppHeader';
import { db, updateStoredPhotos } from './db/database';
import { ImportPage } from './pages/ImportPage';
import { ScreeningPage } from './pages/ScreeningPage';
import { FinalSelectionPage } from './pages/FinalSelectionPage';
import { RenamePage } from './pages/RenamePage';
import { usePhotoStore } from './stores/photoStore';
import type { AppStep, ProjectInfo } from './types/photo';

export default function App() {
  const project = usePhotoStore((state) => state.project);
  const photos = usePhotoStore((state) => state.photos);
  const step = usePhotoStore((state) => state.step);
  const setStep = usePhotoStore((state) => state.setStep);
  const dirty = usePhotoStore((state) => state.isDirty);
  const markSaved = usePhotoStore((state) => state.markSaved);
  const [recentProject, setRecentProject] = useState<ProjectInfo | null>(null);
  const saveTimer = useRef<number | null>(null);
  const refreshRecent = useCallback(async () => {
    const latest = await db.projects.orderBy('updatedAt').last();
    setRecentProject(latest ?? null);
  }, []);
  useEffect(() => { void refreshRecent(); }, [refreshRecent]);
  useEffect(() => {
    if (!project || !dirty || !photos.length) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try { await updateStoredPhotos(project.id, photos); markSaved(); void refreshRecent(); }
      catch { /* Dirty state remains visible; import/export still works in memory. */ }
    }, 700);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [dirty, markSaved, photos, project, refreshRecent]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const navigate = (target: AppStep) => {
    if (!project && target !== 'import') return;
    if (target === 'import' && project && !confirm('返回导入首页不会删除当前项目；当前进度已保存在浏览器中。是否继续？')) return;
    setStep(target);
  };
  return <div className="app-shell"><AppHeader project={project} step={step} onNavigate={navigate} />{step === 'import' ? <ImportPage recentProject={recentProject} onRecentChanged={refreshRecent} /> : null}{step === 'screen' ? <ScreeningPage /> : null}{step === 'final' ? <FinalSelectionPage /> : null}{step === 'rename' ? <RenamePage /> : null}</div>;
}
