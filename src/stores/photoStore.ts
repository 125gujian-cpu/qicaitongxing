import { create } from 'zustand';
import type { AppStep, HistoryAction, HistoryActionType, PhotoItem, PhotoPatch, PhotoStatus, ProjectInfo } from '../types/photo';

interface PhotoState {
  project: ProjectInfo | null;
  photos: PhotoItem[];
  step: AppStep;
  selectedIds: Set<string>;
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
  isDirty: boolean;
  setProject: (project: ProjectInfo, photos: PhotoItem[], step?: AppStep) => void;
  clearProject: () => void;
  setStep: (step: AppStep) => void;
  setSelectedIds: (ids: Set<string>) => void;
  toggleSelected: (id: string) => void;
  changeStatus: (ids: string[], status: PhotoStatus) => void;
  toggleFinal: (ids: string[], selected?: boolean) => void;
  reorderFinal: (orderedIds: string[]) => void;
  renamePhotos: (updates: Map<string, string | null>, batch?: boolean) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const HISTORY_LIMIT = 100;

function applyPatches(photos: PhotoItem[], patches: PhotoPatch[]): PhotoItem[] {
  const map = new Map(patches.map((patch) => [patch.id, patch.fields]));
  return photos.map((photo) => {
    const fields = map.get(photo.id);
    return fields ? { ...photo, ...fields } : photo;
  });
}

function withHistory(
  state: PhotoState,
  type: HistoryActionType,
  before: PhotoPatch[],
  after: PhotoPatch[],
): Partial<PhotoState> {
  if (!after.length) return {};
  const action: HistoryAction = { type, timestamp: Date.now(), before, after };
  return {
    photos: applyPatches(state.photos, after),
    undoStack: [...state.undoStack, action].slice(-HISTORY_LIMIT),
    redoStack: [],
    isDirty: true,
  };
}

function normalizedFinalPatches(photos: PhotoItem[], selectedById: Map<string, boolean>): { before: PhotoPatch[]; after: PhotoPatch[] } {
  const originalById = new Map(photos.map((photo) => [photo.id, photo]));
  const next = photos.map((photo) => ({ ...photo, finalSelected: selectedById.get(photo.id) ?? photo.finalSelected }));
  const existingOrder = photos
    .filter((photo) => photo.finalSelected && (selectedById.get(photo.id) ?? true))
    .sort((a, b) => (a.finalOrder ?? Infinity) - (b.finalOrder ?? Infinity))
    .map((photo) => photo.id);
  const newlySelected = next.filter((photo) => photo.finalSelected && !originalById.get(photo.id)?.finalSelected).map((photo) => photo.id);
  const orderById = new Map([...existingOrder, ...newlySelected].map((id, index) => [id, index]));
  const before: PhotoPatch[] = [];
  const after: PhotoPatch[] = [];
  for (const photo of next) {
    const original = originalById.get(photo.id)!;
    const finalOrder = photo.finalSelected ? orderById.get(photo.id) : undefined;
    if (original.finalSelected !== photo.finalSelected || original.finalOrder !== finalOrder) {
      before.push({ id: photo.id, fields: { finalSelected: original.finalSelected, finalOrder: original.finalOrder } });
      after.push({ id: photo.id, fields: { finalSelected: photo.finalSelected, finalOrder } });
    }
  }
  return { before, after };
}

export const usePhotoStore = create<PhotoState>((set) => ({
  project: null,
  photos: [],
  step: 'import',
  selectedIds: new Set(),
  undoStack: [],
  redoStack: [],
  isDirty: false,
  setProject: (project, photos, step = photos.length ? 'screen' : 'import') => set({ project, photos, step, selectedIds: new Set(), undoStack: [], redoStack: [], isDirty: true }),
  clearProject: () => set({ project: null, photos: [], step: 'import', selectedIds: new Set(), undoStack: [], redoStack: [], isDirty: false }),
  setStep: (step) => set({ step }),
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  toggleSelected: (id) => set((state) => {
    const selectedIds = new Set(state.selectedIds);
    if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
    return { selectedIds };
  }),
  changeStatus: (ids, status) => set((state) => {
    const idSet = new Set(ids);
    const targets = state.photos.filter((photo) => idSet.has(photo.id) && photo.status !== status);
    const before = targets.map((photo) => ({ id: photo.id, fields: { status: photo.status } }));
    const after = targets.map((photo) => ({ id: photo.id, fields: { status } }));
    return { ...withHistory(state, ids.length > 1 ? 'batch-change-status' : 'change-status', before, after), selectedIds: new Set<string>() };
  }),
  toggleFinal: (ids, selected) => set((state) => {
    const idSet = new Set(ids);
    const selectedById = new Map<string, boolean>();
    state.photos.forEach((photo) => {
      if (idSet.has(photo.id)) selectedById.set(photo.id, selected ?? !photo.finalSelected);
    });
    const { before, after } = normalizedFinalPatches(state.photos, selectedById);
    const becomesSelected = after.some((patch) => patch.fields.finalSelected);
    return withHistory(state, becomesSelected ? 'select-final' : 'remove-final', before, after);
  }),
  reorderFinal: (orderedIds) => set((state) => {
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    const targets = state.photos.filter((photo) => photo.finalSelected && orderMap.has(photo.id) && photo.finalOrder !== orderMap.get(photo.id));
    const before = targets.map((photo) => ({ id: photo.id, fields: { finalOrder: photo.finalOrder } }));
    const after = targets.map((photo) => ({ id: photo.id, fields: { finalOrder: orderMap.get(photo.id) } }));
    return withHistory(state, 'reorder-final', before, after);
  }),
  renamePhotos: (updates, batch = false) => set((state) => {
    const targets = state.photos.filter((photo) => updates.has(photo.id) && photo.renamedName !== updates.get(photo.id));
    const before = targets.map((photo) => ({ id: photo.id, fields: { renamedName: photo.renamedName } }));
    const after = targets.map((photo) => ({ id: photo.id, fields: { renamedName: updates.get(photo.id) ?? null } }));
    return withHistory(state, batch ? 'batch-rename' : 'rename', before, after);
  }),
  undo: () => set((state) => {
    const action = state.undoStack.at(-1);
    if (!action) return state;
    return {
      photos: applyPatches(state.photos, action.before),
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
      isDirty: true,
    };
  }),
  redo: () => set((state) => {
    const action = state.redoStack.at(-1);
    if (!action) return state;
    return {
      photos: applyPatches(state.photos, action.after),
      undoStack: [...state.undoStack, action],
      redoStack: state.redoStack.slice(0, -1),
      isDirty: true,
    };
  }),
  markSaved: () => set({ isDirty: false }),
}));

export const photoStoreApi = usePhotoStore;
