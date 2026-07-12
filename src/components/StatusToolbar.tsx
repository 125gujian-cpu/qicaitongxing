import { CheckSquare2, Grid2X2, ListFilter, Search, Square, Star, Trash2 } from 'lucide-react';
import type { PhotoStatus } from '../types/photo';

export type StatusFilter = PhotoStatus | 'all';
export type SortMode = 'import-asc' | 'name-asc' | 'name-desc';

interface StatusToolbarProps {
  filter: StatusFilter; setFilter: (filter: StatusFilter) => void;
  sort: SortMode; setSort: (sort: SortMode) => void;
  search: string; setSearch: (search: string) => void;
  selectedCount: number; onSelectAll: () => void; onClearSelection: () => void;
  onBatch: (status: PhotoStatus) => void;
}

export function StatusToolbar(props: StatusToolbarProps) {
  return (
    <div className="screen-toolbar">
      <div className="filter-control"><ListFilter size={16} /><select aria-label="按状态筛选" value={props.filter} onChange={(event) => props.setFilter(event.target.value as StatusFilter)}><option value="all">全部状态</option><option value="unclassified">只看未分类</option><option value="good">好片</option><option value="maybe">待保留</option><option value="reject">废片</option></select></div>
      <label className="search-control"><Search size={16} /><input aria-label="搜索文件名" value={props.search} onChange={(event) => props.setSearch(event.target.value)} placeholder="搜索文件名" /></label>
      <select className="sort-control" aria-label="排序方式" value={props.sort} onChange={(event) => props.setSort(event.target.value as SortMode)}><option value="import-asc">按导入顺序</option><option value="name-asc">文件名 A–Z</option><option value="name-desc">文件名 Z–A</option></select>
      <span className="toolbar-divider" />
      <button className="button compact secondary" onClick={props.onSelectAll}><CheckSquare2 size={15} />全选当前</button>
      <button className="button compact ghost" onClick={props.onClearSelection} disabled={!props.selectedCount}><Square size={15} />取消全选</button>
      <span className="selected-count">已选 {props.selectedCount}</span>
      <div className="bulk-actions">
        <button className="button compact status-good" disabled={!props.selectedCount} onClick={() => props.onBatch('good')}><Star size={14} />设为好片</button>
        <button className="button compact status-maybe" disabled={!props.selectedCount} onClick={() => props.onBatch('maybe')}><Grid2X2 size={14} />待保留</button>
        <button className="button compact status-reject" disabled={!props.selectedCount} onClick={() => props.onBatch('reject')}><Trash2 size={14} />废片</button>
      </div>
    </div>
  );
}
