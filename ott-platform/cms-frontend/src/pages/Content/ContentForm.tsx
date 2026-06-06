import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver }          from '@hookform/resolvers/zod';
import { z }                    from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, Film, Tv }             from 'lucide-react';
import { contentApi }          from '@/api/endpoints';
import { Button, Input, Textarea, Select, Card } from '@/components/UI';
import type { ContentType }    from '@/types';
import toast from 'react-hot-toast';

const schema = z.object({
  title:            z.string().min(1, 'Title is required').max(500),
  description:      z.string().optional(),
  shortDescription: z.string().max(300).optional(),
  language:         z.string().default('en'),
  releaseYear:      z.coerce.number().min(1900).max(2100).optional(),
  durationSeconds:  z.coerce.number().optional(),
  ageRating:        z.string().optional(),
  status:           z.enum(['draft','processing','published','scheduled','archived']).default('draft'),
  isPremium:        z.boolean().default(false),
  isFeatured:       z.boolean().default(false),
  isTrending:       z.boolean().default(false),
  imdbRating:       z.coerce.number().min(0).max(10).optional(),
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
        trailerUrl:  data.trailerUrl  || undefined,
        posterUrl:   data.posterUrl   || undefined,
        bannerUrl:   data.bannerUrl   || undefined,
        scheduledAt: data.scheduledAt || undefined,
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
            <h3 className="mb-4 font-semibold text-white">Basic Information</h3>
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
            <div className="space-y-4">
              <Input label="Trailer URL" type="url" {...register('trailerUrl')} placeholder="https://…" />
              <Input label="Poster URL" type="url" {...register('posterUrl')} placeholder="https://…/poster.webp (2:3 portrait)" />
              <Input label="Banner URL" type="url" {...register('bannerUrl')} placeholder="https://…/banner.webp (16:9 landscape)" />
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
  );
}
