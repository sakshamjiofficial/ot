import React, { useState } from 'react';
import { useNavigate }     from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Film, Tv, Eye, Pencil, Trash2, Upload, X } from 'lucide-react';
import { contentApi, configApi, tmdbApi }      from '@/api/endpoints';
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

  const [isTmdbOpen, setIsTmdbOpen] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);

  // Fetch the TMDB API Key from config
  const { data: appConfig } = useQuery({
    queryKey: ['app-config'],
    queryFn: configApi.getAll,
  });

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: contentApi.listGenres,
  });

  const tmdbApiKey = appConfig?.tmdb_api_key || '';

  const handleTmdbSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmdbApiKey) {
      toast.error('Please configure your TMDB API Key in Settings first.');
      return;
    }
    if (!tmdbQuery.trim()) return;

    setSearchingTmdb(true);
    try {
      const data = await tmdbApi.search(tmdbQuery, type);
      setTmdbResults(data.results || []);
    } catch (err) {
      toast.error('Failed to search TMDB');
    } finally {
      setSearchingTmdb(false);
    }
  };

  const handleSelectTmdbItem = async (tmdbId: number) => {
    if (!tmdbApiKey) return;
    try {
      const data = await tmdbApi.details(tmdbId, type);

      // Match genres
      const matchedGenreIds: number[] = [];
      if (data.genres && genres.length > 0) {
        data.genres.forEach((tg: any) => {
          const matched = genres.find(
            (g) => g.name.toLowerCase() === tg.name.toLowerCase()
          );
          if (matched) matchedGenreIds.push(matched.id);
        });
      }

      const releaseDate = isMovie ? data.release_date : data.first_air_date;
      let featurePosterUrl: string | undefined = undefined;
      let featureTextImageUrl: string | undefined = undefined;
      if (data.images) {
        const noLangPoster = data.images.posters?.find((p: any) => !p.iso_639_1);
        if (noLangPoster) {
          featurePosterUrl = `https://image.tmdb.org/t/p/original${noLangPoster.file_path}`;
        }
        const enLogo = data.images.logos?.find((l: any) => l.iso_639_1 === 'en');
        if (enLogo) {
          featureTextImageUrl = `https://image.tmdb.org/t/p/original${enLogo.file_path}`;
        }
      }

      const payload = {
        type,
        title: isMovie ? data.title : data.name,
        description: data.overview || undefined,
        shortDescription: data.overview ? data.overview.slice(0, 290) + '...' : undefined,
        releaseYear: releaseDate ? parseInt(releaseDate.slice(0, 4), 10) : undefined,
        language: data.original_language || 'en',
        imdbRating: data.vote_average ? parseFloat(data.vote_average.toFixed(1)) : undefined,
        posterUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : undefined,
        bannerUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : undefined,
        featurePosterUrl,
        featureTextImageUrl,
        status: 'draft',
        genreIds: matchedGenreIds,
      };

      const result = await contentApi.create(payload);
      toast.success(`Successfully imported "${payload.title}"!`);
      setIsTmdbOpen(false);
      setTmdbResults([]);
      setTmdbQuery('');
      
      // Redirect to edit page
      navigate(`/${isMovie ? 'movies' : 'series'}/${result.id}/edit`);
    } catch (err) {
      toast.error('Failed to import item from TMDB');
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: [type === 'movie' ? 'movies' : 'series', { page, search, status }],
    queryFn:  () => isMovie
      ? contentApi.listMovies({ page, limit: 20, search: search || undefined, status: status || undefined })
      : contentApi.listSeries({ page, limit: 20, search: search || undefined, status: status || undefined }),
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
    <>
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
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTmdbOpen(true)}
              className="border-brand-500/30 text-brand-400 hover:bg-brand-500/10"
            >
              🎬 Import from TMDB
            </Button>
            <Button
              icon={<Plus size={16} />}
              onClick={() => navigate(isMovie ? '/movies/new' : '/series/new')}
            >
              Add {isMovie ? 'Movie' : 'Series'}
            </Button>
          </div>
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
                  className="rounded-lg p-1.5 text-surface-400 hover:bg-surface-600 hover:text-red-400 transition-colors"
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

      {/* TMDB Search Modal */}
      {isTmdbOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => { setIsTmdbOpen(false); setTmdbResults([]); setTmdbQuery(''); }} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-2xl animate-scale-in flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-surface-700 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                🎬 Import from TMDB ({isMovie ? 'Movie' : 'TV Series'})
              </h3>
              <button
                type="button"
                onClick={() => { setIsTmdbOpen(false); setTmdbResults([]); setTmdbQuery(''); }}
                className="rounded-lg p-1 text-surface-400 hover:bg-surface-700 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTmdbSearch} className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  type="text"
                  placeholder={`Search by ${isMovie ? 'movie' : 'series'} title...`}
                  value={tmdbQuery}
                  onChange={(e) => setTmdbQuery(e.target.value)}
                  className="w-full rounded-lg border border-surface-600 bg-surface-700 pl-10 pr-4 py-2 text-sm text-white placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <Button type="submit" loading={searchingTmdb} size="sm">Search</Button>
            </form>

            <div className="mt-4 overflow-y-auto flex-1 divide-y divide-surface-700 max-h-[50vh] pr-1">
              {tmdbResults.length > 0 ? (
                tmdbResults.map((item: any) => {
                  const releaseDate = isMovie ? item.release_date : item.first_air_date;
                  const year = releaseDate ? `(${releaseDate.slice(0, 4)})` : '';
                  return (
                    <div key={item.id} className="flex gap-4 py-3 items-center hover:bg-surface-700/30 px-2 rounded-lg transition-colors">
                      <div className="h-16 w-11 flex-shrink-0 bg-surface-700 rounded overflow-hidden flex items-center justify-center border border-surface-600">
                        {item.poster_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                            alt={item.title || item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Film size={16} className="text-surface-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">
                          {isMovie ? item.title : item.name} {year}
                        </p>
                        <p className="text-xs text-surface-400 truncate mt-0.5">
                          Original: {isMovie ? item.original_title : item.original_name}
                        </p>
                        <p className="text-xs text-surface-400 truncate">
                          Rating: ⭐ {item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectTmdbItem(item.id)}
                        className="inline-flex items-center justify-center rounded-lg bg-surface-700 hover:bg-brand-500 hover:text-white px-3 py-1.5 text-xs font-semibold text-surface-200 transition-colors shadow-sm"
                      >
                        Import
                      </button>
                    </div>
                  );
                })
              ) : tmdbQuery && !searchingTmdb ? (
                <div className="py-8 text-center text-sm text-surface-400">
                  No results found.
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-surface-400">
                  {!tmdbApiKey ? (
                    <span className="text-red-400 font-medium">⚠ Please set up your TMDB API Key in Settings first.</span>
                  ) : (
                    "Type a title above to search from The Movie Database."
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
