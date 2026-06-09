import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, ArrowUp, ArrowDown, Smartphone, X,
  CheckCircle, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { homeSectionsApi, contentApi } from '@/api/endpoints';
import { Button, Input, Select, Card, ConfirmDialog } from '@/components/UI';
import toast from 'react-hot-toast';

interface QueryConfig {
  limit?: number;
  genre_slug?: string;
  language?: string;
  min_rating?: number;
}

interface HomeSection {
  id: number;
  title: string;
  sectionType: string;
  queryConfig: QueryConfig;
  sortOrder: number;
  isActive: boolean;
}

export default function AndroidComponentsPage() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<HomeSection | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [sectionType, setSectionType] = useState('featured');
  const [limit, setLimit] = useState(10);
  const [genreSlug, setGenreSlug] = useState('');
  const [language, setLanguage] = useState('en');
  const [minRating, setMinRating] = useState(7.0);
  const [isActive, setIsActive] = useState(true);

  // Fetch Home Sections
  const { data: sections = [], isLoading, refetch } = useQuery<HomeSection[]>({
    queryKey: ['home-sections'],
    queryFn: homeSectionsApi.list,
  });

  // Fetch Genres for Dropdown
  const { data: genres = [] } = useQuery({
    queryKey: ['genres'],
    queryFn: contentApi.listGenres,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => homeSectionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections'] });
      toast.success('Android component created');
      closeModal();
    },
    onError: () => toast.error('Failed to create component'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => homeSectionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections'] });
      toast.success('Android component updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update component'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => homeSectionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections'] });
      toast.success('Android component deleted');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete component'),
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => homeSectionsApi.reorder(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['home-sections'] });
      toast.success('Components reordered');
    },
    onError: () => toast.error('Failed to save order'),
  });

  const handleOpenCreate = () => {
    setSelectedSection(null);
    setTitle('');
    setSectionType('featured');
    setLimit(10);
    setGenreSlug(genres[0]?.slug || '');
    setLanguage('en');
    setMinRating(7.0);
    setIsActive(true);
    setIsOpen(true);
  };

  const handleOpenEdit = (section: HomeSection) => {
    setSelectedSection(section);
    setTitle(section.title);
    setSectionType(section.sectionType);
    setLimit(section.queryConfig?.limit ?? 10);
    setGenreSlug(section.queryConfig?.genre_slug ?? (genres[0]?.slug || ''));
    setLanguage(section.queryConfig?.language ?? 'en');
    setMinRating(section.queryConfig?.min_rating ?? 7.0);
    setIsActive(section.isActive);
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedSection(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const queryConfig: QueryConfig = { limit };
    if (sectionType === 'genre') queryConfig.genre_slug = genreSlug;
    if (sectionType === 'language') queryConfig.language = language;
    if (sectionType === 'top_rated') queryConfig.min_rating = minRating;

    const payload = {
      title,
      sectionType,
      queryConfig,
      isActive,
    };

    if (selectedSection) {
      updateMutation.mutate({ id: selectedSection.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleActive = (section: HomeSection) => {
    updateMutation.mutate({
      id: section.id,
      data: { ...section, isActive: !section.isActive },
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const newIds = sections.map((s) => s.id);
    // Swap in array
    const temp = newIds[index];
    newIds[index] = newIds[targetIndex];
    newIds[targetIndex] = temp;

    reorderMutation.mutate(newIds);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Smartphone className="text-brand-500" size={24} />
            Android Home Components
          </h1>
          <p className="mt-1 text-sm text-surface-300">
            Manage sections, lists, and layout order displayed on the Android client app home screen.
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={handleOpenCreate}>
          Add Component
        </Button>
      </div>

      {/* Main List */}
      <Card padding={false} className="overflow-hidden border border-surface-700">
        <div className="divide-y divide-surface-700">
          {sections.length === 0 ? (
            <div className="py-12 text-center text-surface-400">
              No components configured yet. Click "Add Component" to get started.
            </div>
          ) : (
            sections.map((section, index) => (
              <div
                key={section.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 transition-colors ${
                  section.isActive ? 'bg-surface-800/40 hover:bg-surface-800/80' : 'bg-surface-900/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Reordering Handles */}
                  <div className="flex flex-col gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => moveItem(index, 'up')}
                      className="rounded p-0.5 text-surface-400 hover:bg-surface-700 hover:text-white disabled:opacity-20"
                      title="Move Up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      disabled={index === sections.length - 1}
                      onClick={() => moveItem(index, 'down')}
                      className="rounded p-0.5 text-surface-400 hover:bg-surface-700 hover:text-white disabled:opacity-20"
                      title="Move Down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full font-semibold">
                        Order #{index + 1}
                      </span>
                      <h3 className="font-semibold text-white truncate">{section.title}</h3>
                    </div>
                    <p className="mt-1 text-xs text-surface-300 capitalize flex items-center gap-2">
                      <span className="font-medium text-surface-200 bg-surface-700 px-2 py-0.5 rounded">
                        {section.sectionType.replace('_', ' ')}
                      </span>
                      <span>•</span>
                      <span>Limit: {section.queryConfig?.limit ?? 10}</span>
                      {section.sectionType === 'genre' && (
                        <>
                          <span>•</span>
                          <span className="text-brand-400">Genre: {section.queryConfig?.genre_slug}</span>
                        </>
                      )}
                      {section.sectionType === 'language' && (
                        <>
                          <span>•</span>
                          <span className="text-blue-400">Lang: {section.queryConfig?.language?.toUpperCase()}</span>
                        </>
                      )}
                      {section.sectionType === 'top_rated' && (
                        <>
                          <span>•</span>
                          <span className="text-yellow-400">Min Rating: ⭐ {section.queryConfig?.min_rating}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleActive(section)}
                    className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold border transition-all ${
                      section.isActive
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
                        : 'bg-surface-700 text-surface-400 border-surface-600 hover:bg-surface-600'
                    }`}
                  >
                    {section.isActive ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => handleOpenEdit(section)}
                    className="rounded-lg p-2 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    onClick={() => setDeleteId(section.id)}
                    className="rounded-lg p-2 text-surface-400 hover:bg-surface-700 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Editor Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-surface-700 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Layers className="text-brand-500" size={18} />
                {selectedSection ? 'Edit Home Component' : 'Add Home Component'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-surface-400 hover:bg-surface-700 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <Input
                label="Section Title"
                placeholder="e.g. Action Thrillers"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />

              <Select
                label="Component Feed Type"
                options={[
                  { value: 'featured', label: 'Featured Banner Slider' },
                  { value: 'trending', label: 'Trending Content Row' },
                  { value: 'recently_added', label: 'Recently Added Row' },
                  { value: 'continue_watching', label: 'Continue Watching Row' },
                  { value: 'genre', label: 'Genre Filter Row' },
                  { value: 'series', label: 'TV Series List Row' },
                  { value: 'language', label: 'Language Specific Row' },
                  { value: 'top_rated', label: 'Top Rated Content Row' },
                ]}
                value={sectionType}
                onChange={(e) => setSectionType(e.target.value)}
              />

              <Input
                label="Max Items to Load"
                type="number"
                min={1}
                max={50}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                required
              />

              {/* Conditional Config Parameters */}
              {sectionType === 'genre' && (
                <Select
                  label="Select Genre"
                  options={genres.map((g) => ({ value: g.slug, label: g.name }))}
                  value={genreSlug}
                  onChange={(e) => setGenreSlug(e.target.value)}
                />
              )}

              {sectionType === 'language' && (
                <Input
                  label="Language ISO Code"
                  placeholder="e.g. hi, en, es"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  required
                />
              )}

              {sectionType === 'top_rated' && (
                <Input
                  label="Minimum IMDb Rating"
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="10.0"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  required
                />
              )}

              <div className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive(!isActive)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    isActive ? 'bg-brand-500' : 'bg-surface-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-surface-200">
                  {isActive ? 'Component is active and visible' : 'Component is disabled'}
                </span>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-surface-700 pt-4">
                <Button type="button" variant="outline" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                  {selectedSection ? 'Save Changes' : 'Create Component'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        title="Remove Component"
        description="Are you sure you want to remove this home component? The section will no longer be rendered on the mobile application."
        confirmLabel="Remove Component"
        danger
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
