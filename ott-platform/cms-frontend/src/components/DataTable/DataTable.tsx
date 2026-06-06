import React, { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Button, Spinner } from '@/components/UI';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key:       keyof T | string;
  header:    string;
  render?:   (row: T) => React.ReactNode;
  sortable?: boolean;
  width?:    string;
  align?:    'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns:      Column<T>[];
  data:         T[];
  isLoading?:   boolean;
  keyField?:    keyof T;
  onRowClick?:  (row: T) => void;
  rowActions?:  (row: T) => React.ReactNode;
  pagination?:  {
    page:       number;
    limit:      number;
    total:      number;
    totalPages: number;
    onPage:     (page: number) => void;
  };
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  keyField = 'id' as keyof T,
  onRowClick,
  rowActions,
  pagination,
  emptyMessage = 'No data found',
  stickyHeader,
}: DataTableProps<T>) {
  const [sortKey,  setSortKey]  = useState<string | null>(null);
  const [sortDir,  setSortDir]  = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: Column<T>) => {
    if (!col.sortable) return;
    const key = String(col.key);
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className="flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {/* Header */}
          <thead className={cn(
            'border-b border-surface-700 bg-surface-800',
            stickyHeader && 'sticky top-0 z-10',
          )}>
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  style={{ width: col.width }}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-surface-300',
                    col.sortable && 'cursor-pointer select-none hover:text-white',
                    col.align === 'right'  && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                  onClick={() => handleSort(col)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    col.align === 'right'  && 'justify-end',
                    col.align === 'center' && 'justify-center',
                  )}>
                    {col.header}
                    {col.sortable && (
                      <span className="text-surface-500">
                        {sortKey === String(col.key)
                          ? sortDir === 'asc'
                            ? <ChevronUp size={12} />
                            : <ChevronDown size={12} />
                          : <ChevronsUpDown size={12} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {rowActions && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-surface-300">Actions</th>}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-surface-700 bg-surface-800">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="py-16 text-center">
                  <Spinner className="mx-auto" size="lg" />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (rowActions ? 1 : 0)} className="py-16 text-center text-surface-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, idx) => (
                <tr
                  key={String(row[keyField] ?? idx)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-700/50',
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-4 py-3.5 text-sm text-surface-100',
                        col.align === 'right'  && 'text-right',
                        col.align === 'center' && 'text-center',
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String(row[col.key as keyof T] ?? '—')}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-surface-700 px-4 py-3">
          <p className="text-xs text-surface-300">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="ghost"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPage(pagination.page - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const p = Math.max(1, pagination.page - 2) + i;
              if (p > pagination.totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => pagination.onPage(p)}
                  className={cn(
                    'h-7 w-7 rounded-md text-xs font-medium transition-colors',
                    p === pagination.page
                      ? 'bg-brand-500 text-white'
                      : 'text-surface-300 hover:bg-surface-700 hover:text-white',
                  )}
                >
                  {p}
                </button>
              );
            })}
            <Button
              size="xs"
              variant="ghost"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => pagination.onPage(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
