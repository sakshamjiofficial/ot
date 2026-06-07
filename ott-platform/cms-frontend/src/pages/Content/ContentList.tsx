import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Film, Tv, Eye, Pencil, Trash2, Upload } from 'lucide-react';
import { contentApi }      from '@/api/endpoints';
import { DataTable }       from '@/components/DataTable/DataTable';
import {
  Button, Input, Select, StatusBadge,
  ConfirmDialog, Card, EmptyState,
} from '@/components/UI';
import { formatDate, formatDuration, formatNumber } from '@/utils/cn';
import type { Content, ContentType } from '@/types';
import toast from 'react-hot-toast';

interface ContentListProps { type: ContentType; }

export default function ContentList({ type }: ContentListProps) {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isMovie = type === 'movie';

  const { data, isLoading } = useQuery({
    queryKey: [type === 'movie' ? 'movies' : 'series', { page, search, status }],
    queryFn:  () => isMovie
      ? contentApi.listMovies({ page, limit: 20, search: search || undefined })
      : contentApi.listSeries({ page, limit: 20, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [isMovie ? 'movies' : 'series'] });
      toast.success('Content deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete content'),
  });

  const items: Content[] = data?.items ?? data?.data ?? [];
  const meta             = data?.meta ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  const columns = [
    {
      key:    'poster',
      header: '',
      width:  '60px',
      render: (row: Content) => (
        <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-700">
          {row.posterUrl
            ? <img src={row.posterUrl} alt={row.title} className="h-full w-full object-cover" />
            : <div className="flex h-full items-center justify-center text-surface-500">
                {isMovie ? <Film size={16} /> : <Tv size={16} />}
              </div>
          }
        </div>
      ),
    },
    {
      key:      'title',
      header:   'Title',
      sortable: true,
      render:   (row: Content) => (
        <div>
          <p className="font-medium text-white line-clamp-1">{row.title}</p>
          <p className="mt-0.5 text-xs text-surface-300">
            {row.releaseYear}
            {row.language && ` · ${row.language.toUpperCase()}`}
            {row.ageRating && ` · ${row.ageRating}`}
          </p>
        </div>
      ),
    },
    {
      key:    'genres',
      header: 'Genres',
      render: (row: Content) => (
        <div className="flex flex-wrap gap-1">
          {row.genres?.slice(0, 2).map((g) => (
            <span key={g.id} className="rounded-full bg-surface-600 px-2 py-0.5 text-xs text-surface-200">
              {g.name}
            </span>
          ))}
          {(row.genres?.length ?? 0) > 2 && (
            <span className="text-xs text-surface-400">+{row.genres!.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key:      'status',
      header:   'Status',
      sortable: true,
      render:   (row: Content) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={row.status} />
          {row.isPremium && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-400">Premium</span>
          )}
        </div>
      ),
    },
    {
      key:      'totalPlays',
      header:   'Plays',
      sortable: true,
      align:    'right' as const,
      render:   (row: Content) => (
        <span className="font-mono text-surface-100">{formatNumber(row.totalPlays)}</span>
      ),
    },
    {
      key:    'duration',
      header: 'Duration',
      align:  'right' as const,
      render: (row: Content) => (
        <span className="text-surface-300">{row.durationSeconds ? formatDuration(row.durationSeconds) : '—'}</span>
      ),
    },
    {
      key:      'publishedAt',
      header:   'Published',
      sortable: true,
      render:   (row: Content) => (
        <span className="text-surface-300 text-xs">{row.publishedAt ? formatDate(row.publishedAt) : '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <Input
            className="max-w-xs"
            placeholder={`Search ${isMovie ? 'movies' : 'series'}…`}
            leftIcon={<Search size={14} />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <Select
            className="w-36"
            options={[
              { value: 'published', label: 'Published' },
              { value: 'draft',     label: 'Draft' },
              { value: 'processing',label: 'Processing' },
              { value: 'archived',  label: 'Archived' },
            ]}
            placeholder="All Status"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          />
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={() => navigate(isMovie ? '/movies/new' : '/series/new')}
        >
          Add {isMovie ? 'Movie' : 'Series'}
        </Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <DataTable
          columns={columns}
          data={items}
          isLoading={isLoading}
          keyField="id"
          emptyMessage={`No ${isMovie ? 'movies' : 'series'} found`}
          onRowClick={(row) => navigate(`/${isMovie ? 'movies' : 'series'}/${row.id}/edit`)}
          rowActions={(row) => (
            <div className="flex justify-end gap-1">
              {isMovie ? (
                <button
                  onClick={() => navigate(`/movies/${row.id}/upload`)}
                  className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-600 hover:text-white transition-colors"
                  title="Upload video"
                >
                  <Upload size={14} />
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/series/${row.id}/episodes`)}
                  className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-600 hover:text-white transition-colors"
                  title="Manage Episodes"
                >
                  <Tv size={14} />
                </button>
              )}
              <button
                onClick={() => navigate(`/${isMovie ? 'movies' : 'series'}/${row.id}/edit`)}
                className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-600 hover:text-white transition-colors"
                title="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => setDeleteId(row.id)}
                className="rounded-lg p-1.5 text-surface-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
          pagination={{
            page:       meta.page,
            limit:      meta.limit,
            total:      meta.total,
            totalPages: meta.totalPages,
            onPage:     setPage,
          }}
          stickyHeader
        />
      </Card>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Content"
        description="This will permanently delete the content and all associated video assets, subtitles, and transcoding jobs. This action cannot be undone."
        confirmLabel="Delete Permanently"
        danger
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
