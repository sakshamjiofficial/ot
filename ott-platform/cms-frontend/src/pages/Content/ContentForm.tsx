import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver }          from '@hookform/resolvers/zod';
import { z }                    from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Film, Tv, Search, X }             from 'lucide-react';
import { contentApi, configApi, tmdbApi }          from '@/api/endpoints';
import { Button, Input, Textarea, Select, Card, Spinner } from '@/components/UI';
import type { ContentType }    from '@/types';
import toast from 'react-hot-toast';

const schema = z.object({
  title:            z.string().min(1, 'Title is required').max(500),
  description:      z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  language:         z.string().default('en'),
  releaseYear:      z.preprocess((val) => val === '' || val === null || val === undefined ? undefined : val, z.coerce.number().min(1900).max(2100).optional()),
  durationSeconds:  z.preprocess((val) => val === '' || val === null || val === undefined ? undefined : val, z.coerce.number().optional()),
  ageRating:        z.string().optional(),
  status:           z.enum(['draft','processing','published','scheduled','archived']).default('draft'),
  isPremium:        z.boolean().default(false),
  isFeatured:       z.boolean().default(false),
  isTrending:       z.boolean().default(false),
  imdbRating:       z.preprocess((val) => val === '' || val === null || val === undefined ? undefined : val, z.coerce.number().min(0).max(10).optional()),
  trailerUrl:       z.string().url().optional().or(z.literal('')),
  posterUrl:        z.string().url().optional().or(z.literal('')),
  bannerUrl:        z.string().url().optional().or(z.literal('')),
  genreIds:         z.array(z.coerce.number()).default([]),
  scheduledAt:      z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ContentFormProps { type: ContentType; }

export default function ContentForm({ type }: ContentFormProps) {
  const { id }      = useParams<{ id?: string }>();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const isEdit      = !!id && id !== 'new';
  const isMovie     = type === 'movie';

  const [isTmdbOpen, setIsTmdbOpen] = useState(false);
  const [tmdbQuery, setTmdbQuery] = useState('');
  const [tmdbResults, setTmdbResults] = useState<any[]>([]);
  const [searchingTmdb, setSearchingTmdb] = useState(false);

  // Fetch the TMDB API Key from config
  const { data: appConfig } = useQuery({
    queryKey: ['app-config'],
    queryFn: configApi.getAll,
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

      // Populate form fields
      setValue('title', isMovie ? data.title : data.name, { shouldDirty: true });
      setValue('description', data.overview || '', { shouldDirty: true });
      setValue('shortDescription', data.overview ? data.overview.slice(0, 290) + '...' : '', { shouldDirty: true });
      
      const releaseDate = isMovie ? data.release_date : data.first_air_date;
      if (releaseDate) {
        setValue('releaseYear', parseInt(releaseDate.slice(0, 4), 10), { shouldDirty: true });
      }
      
      if (data.original_language) {
        setValue('language', data.original_language, { shouldDirty: true });
      }

      if (data.vote_average) {
        setValue('imdbRating', parseFloat(data.vote_average.toFixed(1)), { shouldDirty: true });
      }

      if (data.poster_path) {
        setValue('posterUrl', `https://image.tmdb.org/t/p/w500${data.poster_path}`, { shouldDirty: true });
      }

      if (data.backdrop_path) {
        setValue('bannerUrl', `https://image.tmdb.org/t/p/original${data.backdrop_path}`, { shouldDirty: true });
      }

      // Try to match genres if possible
      if (data.genres && genres.length > 0) {
        const matchedGenreIds: number[] = [];
        data.genres.forEach((tg: any) => {
          const matched = genres.find(
            (g) => g.name.toLowerCase() === tg.name.toLowerCase()
          );
          if (matched) matchedGenreIds.push(matched.id);
        });
        if (matchedGenreIds.length > 0) {
          setValue('genreIds', matchedGenreIds, { shouldDirty: true });
        }
      }

      toast.success('Successfully imported details from TMDB!');
      setIsTmdbOpen(false);
      setTmdbResults([]);
      setTmdbQuery('');
    } catch (err) {
      toast.error('Failed to fetch item details from TMDB');
    }
  };

  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn:  contentApi.listGenres,
  });

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['content', id],
    queryFn:  () => contentApi.getById(id!),
    enabled:  isEdit,
  });

  const { register, handleSubmit, reset, watch, setValue, control,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'draft', isPremium: false, isFeatured: false, isTrending: false, language: 'en', genreIds: [] },
  });

  useEffect(() => {
    if (existing) {
      reset({
        ...existing,
        genreIds:        existing.genres?.map((g) => g.id) ?? [],
        durationSeconds: existing.durationSeconds ?? undefined,
        releaseYear:     existing.releaseYear ?? undefined,
        imdbRating:      existing.imdbRating ?? undefined,
        trailerUrl:      existing.trailerUrl ?? '',
        posterUrl:       existing.posterUrl  ?? '',
        bannerUrl:       existing.bannerUrl  ?? '',
        scheduledAt:     existing.scheduledAt?.slice(0, 16) ?? '',
      });
    }
  }, [existing, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      const payload = {
        ...data,
        type,
        description:      data.description      || undefined,
        shortDescription: data.shortDescription || undefined,
        ageRating:        data.ageRating        || undefined,
        trailerUrl:       data.trailerUrl       || undefined,
        posterUrl:        data.posterUrl        || undefined,
        bannerUrl:        data.bannerUrl        || undefined,
        scheduledAt:      data.scheduledAt      || undefined,
      };
      return isEdit
        ? contentApi.update(id!, payload)
        : contentApi.create(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [isMovie ? 'movies' : 'series'] });
      toast.success(isEdit ? 'Content updated' : 'Content created');
      if (!isEdit) {
        navigate(`/${isMovie ? 'movies' : 'series'}/${result.id}/upload`);
      }
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || 'Save failed'),
  });

  const genreIds  = watch('genreIds') ?? [];
  const isPremium = watch('isPremium');
  const isTrending = watch('isTrending');
  const isFeatured = watch('isFeatured');
  const posterUrl = watch('posterUrl');
  const bannerUrl = watch('bannerUrl');

  const toggleGenre = (id: number) => {
    setValue(
      'genreIds',
      genreIds.includes(id) ? genreIds.filter((g) => g !== id) : [...genreIds, id],
      { shouldDirty: true },
    );
  };

  if (isEdit && loadingExisting) {
    return <div className="py-20 text-center text-surface-300">Loading…</div>;
  }

    return (
      <>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(-1)} className="rounded-lg p-2 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-2">
              {isMovie ? <Film size={20} className="text-brand-400" /> : <Tv size={20} className="text-brand-400" />}
              <h2 className="text-xl font-semibold text-white">
                {isEdit ? 'Edit' : 'New'} {isMovie ? 'Movie' : 'Series'}
              </h2>
            </div>
            <div className="ml-auto flex gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate(-1)}>Cancel</Button>
              <Button type="submit" icon={<Save size={16} />} loading={mutation.isPending} disabled={!isDirty && isEdit}>
                {isEdit ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

            {/* Main Info */}
            <div className="space-y-5 lg:col-span-2">
              <Card>
                <div className="mb-4 flex items-center justify-between border-b border-surface-700 pb-3">
                  <h3 className="font-semibold text-white">Basic Information</h3>
                  <button
                    type="button"
                    onClick={() => setIsTmdbOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-400 hover:bg-brand-500 hover:text-white transition-all duration-200 shadow-sm"
                  >
                    🎬 Import from TMDB
                  </button>
                </div>
                <div className="space-y-4">
                  <Input label="Title" required error={errors.title?.message} {...register('title')} placeholder={`${isMovie ? 'Movie' : 'Series'} title`} />
                  <Textarea label="Description" {...register('description')} placeholder="Full description for the content page…" rows={5} />
                  <Textarea label="Short Description" {...register('shortDescription')} placeholder="1-2 sentence teaser (max 300 chars)…" rows={2} />

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Release Year" type="number" min={1900} max={2100} {...register('releaseYear')} error={errors.releaseYear?.message} />
                    {isMovie && (
                      <Input label="Duration (seconds)" type="number" {...register('durationSeconds')} hint="e.g. 5400 = 1h 30m" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Select label="Language" {...register('language')} options={[
                      { value: 'en', label: 'English' },
                      { value: 'hi', label: 'Hindi' },
                      { value: 'ta', label: 'Tamil' },
                      { value: 'te', label: 'Telugu' },
                      { value: 'ml', label: 'Malayalam' },
                      { value: 'bn', label: 'Bengali' },
                      { value: 'mr', label: 'Marathi' },
                    ]} />
                    <Select label="Age Rating" {...register('ageRating')} placeholder="Select rating" options={[
                      { value: 'U',   label: 'U — Universal' },
                      { value: 'U/A', label: 'U/A — Parental Guidance' },
                      { value: 'A',   label: 'A — Adults Only' },
                      { value: '7+',  label: '7+ years' },
                      { value: '13+', label: '13+ years' },
                      { value: '16+', label: '16+ years' },
                      { value: '18+', label: '18+ years' },
                    ]} />
                  </div>

                  <Input label="IMDb Rating" type="number" step="0.1" min={0} max={10} {...register('imdbRating')} placeholder="8.5" />
                </div>
              </Card>

              {/* URLs */}
              <Card>
                <h3 className="mb-4 font-semibold text-white">Media URLs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Input label="Trailer URL" type="url" {...register('trailerUrl')} placeholder="https://…" />
                    <Input label="Poster URL" type="url" {...register('posterUrl')} placeholder="https://…/poster.webp (2:3 portrait)" />
                    <Input label="Banner URL" type="url" {...register('bannerUrl')} placeholder="https://…/banner.webp (16:9 landscape)" />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex flex-col sm:flex-row gap-6">
                      {/* Poster Preview */}
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-medium text-surface-400">Poster Preview (2:3)</span>
                        <div className="relative aspect-[2/3] w-32 overflow-hidden rounded-xl border border-surface-700 bg-surface-800/50 shadow-inner flex items-center justify-center group">
                          {posterUrl ? (
                            <img
                              src={posterUrl}
                              alt="Poster"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/300x450/1e293b/64748b?text=Invalid+Image';
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-surface-500">
                              <Film size={20} />
                              <span className="text-[10px] uppercase tracking-wider font-semibold">2:3 Portrait</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Banner Preview */}
                      <div className="flex flex-col gap-2 flex-1">
                        <span className="text-xs font-medium text-surface-400">Banner Preview (16:9)</span>
                        <div className="relative aspect-[16/9] w-full max-w-sm overflow-hidden rounded-xl border border-surface-700 bg-surface-800/50 shadow-inner flex items-center justify-center group">
                          {bannerUrl ? (
                            <img
                              src={bannerUrl}
                              alt="Banner"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/600x338/1e293b/64748b?text=Invalid+Image';
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-surface-500">
                              <Film size={20} />
                              <span className="text-[10px] uppercase tracking-wider font-semibold">16:9 Landscape</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-5">
              {/* Status & Visibility */}
              <Card>
                <h3 className="mb-4 font-semibold text-white">Status</h3>
                <div className="space-y-4">
                  <Select label="Publish Status" required {...register('status')} options={[
                    { value: 'draft',     label: '📝 Draft' },
                    { value: 'published', label: '✅ Published' },
                    { value: 'scheduled', label: '🕐 Scheduled' },
                    { value: 'archived',  label: '📦 Archived' },
                  ]} />

                  {watch('status') === 'scheduled' && (
                    <Input label="Schedule Date & Time" type="datetime-local" {...register('scheduledAt')} />
                  )}

                  {/* Toggle flags */}
                  {[
                    { key: 'isPremium',  label: 'Premium Content',  desc: 'Requires active subscription' },
                    { key: 'isFeatured', label: 'Featured',         desc: 'Show in hero banners' },
                    { key: 'isTrending', label: 'Trending',         desc: 'Show in trending row' },
                  ].map((flag) => (
                    <label key={flag.key} className="flex cursor-pointer items-center justify-between rounded-lg border border-surface-600 px-4 py-3 hover:bg-surface-700 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">{flag.label}</p>
                        <p className="text-xs text-surface-400">{flag.desc}</p>
                      </div>
                      <Controller
                        name={flag.key as any}
                        control={control}
                        render={({ field }) => (
                          <button
                            type="button"
                            role="switch"
                            aria-checked={field.value}
                            onClick={() => field.onChange(!field.value)}
                            className={`relative h-5 w-9 rounded-full transition-colors ${field.value ? 'bg-brand-500' : 'bg-surface-500'}`}
                          >
                            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${field.value ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        )}
                      />
                    </label>
                  ))}
                </div>
              </Card>

              {/* Genres */}
              <Card>
                <h3 className="mb-3 font-semibold text-white">Genres</h3>
                <div className="flex flex-wrap gap-2">
                  {genres.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => toggleGenre(g.id)}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        genreIds.includes(g.id)
                          ? 'bg-brand-500 text-white'
                          : 'bg-surface-600 text-surface-200 hover:bg-surface-500'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </form>

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
