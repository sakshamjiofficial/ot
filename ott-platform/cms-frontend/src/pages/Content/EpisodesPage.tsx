import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus, Edit2, Trash2, Video, Tv, Play, PlusCircle, LayoutGrid, List } from 'lucide-react';
import { contentApi } from '@/api/endpoints';
import { Card, Button, Input, Textarea, Select, ConfirmDialog, Spinner } from '@/components/UI';
import VideoUploader from '@/components/VideoUploader/VideoUploader';
import toast from 'react-hot-toast';

export default function EpisodesPage() {
  const { id: seriesId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  
  // Season Modal/Form state
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [seasonNumber, setSeasonNumber] = useState<number>(1);
  const [seasonTitle, setSeasonTitle] = useState('');
  const [seasonDescription, setSeasonDescription] = useState('');

  // Episode Form/Modal state
  const [showEpisodeModal, setShowEpisodeModal] = useState(false);
  const [isEditingEpisode, setIsEditingEpisode] = useState(false);
  const [editingEpisodeId, setEditingEpisodeId] = useState<string | null>(null);
  const [epNumber, setEpNumber] = useState<number>(1);
  const [epTitle, setEpTitle] = useState('');
  const [epDescription, setEpDescription] = useState('');
  const [epDuration, setEpDuration] = useState<number>(0);
  const [epIsPremium, setEpIsPremium] = useState(false);
  const [epStatus, setEpStatus] = useState('published');

  // Video Upload Modal state
  const [uploadingEpisode, setUploadingEpisode] = useState<any | null>(null);

  // Confirm delete state
  const [deleteEpisodeId, setDeleteEpisodeId] = useState<string | null>(null);

  // Queries
  const { data: series, isLoading } = useQuery({
    queryKey: ['content', seriesId],
    queryFn: () => contentApi.getById(seriesId!),
    enabled: !!seriesId,
  });

  // Seasons list
  const seasons = series?.seasons || [];
  
  // Selected Season
  const activeSeason = seasons.find((s) => s.id === selectedSeasonId) || seasons[0];

  // Auto-set selected season once loaded
  React.useEffect(() => {
    if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[0].id);
    }
  }, [seasons, selectedSeasonId]);

  // Mutations
  const createSeasonMutation = useMutation({
    mutationFn: (data: any) => contentApi.createSeason(seriesId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', seriesId] });
      toast.success('Season created successfully');
      setShowSeasonModal(false);
      // Reset form
      setSeasonNumber(seasons.length + 1);
      setSeasonTitle('');
      setSeasonDescription('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create season');
    },
  });

  const createEpisodeMutation = useMutation({
    mutationFn: (data: any) => contentApi.createEpisode(selectedSeasonId || activeSeason.id, seriesId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', seriesId] });
      toast.success('Episode created successfully');
      setShowEpisodeModal(false);
      resetEpisodeForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create episode');
    },
  });

  const updateEpisodeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => contentApi.updateEpisode(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', seriesId] });
      toast.success('Episode updated successfully');
      setShowEpisodeModal(false);
      resetEpisodeForm();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update episode');
    },
  });

  const deleteEpisodeMutation = useMutation({
    mutationFn: contentApi.deleteEpisode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content', seriesId] });
      toast.success('Episode deleted successfully');
      setDeleteEpisodeId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to delete episode');
      setDeleteEpisodeId(null);
    },
  });

  const resetEpisodeForm = () => {
    setIsEditingEpisode(false);
    setEditingEpisodeId(null);
    setEpNumber((activeSeason?.episodes?.length || 0) + 1);
    setEpTitle('');
    setEpDescription('');
    setEpDuration(0);
    setEpIsPremium(false);
    setEpStatus('published');
  };

  const handleEditEpisodeClick = (ep: any) => {
    setIsEditingEpisode(true);
    setEditingEpisodeId(ep.id);
    setEpNumber(ep.episodeNumber);
    setEpTitle(ep.title);
    setEpDescription(ep.description || '');
    setEpDuration(ep.durationSeconds || 0);
    setEpIsPremium(ep.isPremium);
    setEpStatus(ep.status);
    setShowEpisodeModal(true);
  };

  const handleSeasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSeasonMutation.mutate({
      seasonNumber: Number(seasonNumber),
      title: seasonTitle.trim() || undefined,
      description: seasonDescription.trim() || undefined,
    });
  };

  const handleEpisodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!epTitle.trim()) {
      toast.error('Episode title is required');
      return;
    }

    const payload = {
      episodeNumber: Number(epNumber),
      title: epTitle.trim(),
      description: epDescription.trim() || undefined,
      durationSeconds: epDuration > 0 ? Number(epDuration) : undefined,
      isPremium: epIsPremium,
      status: epStatus,
    };

    if (isEditingEpisode && editingEpisodeId) {
      updateEpisodeMutation.mutate({ id: editingEpisodeId, data: payload });
    } else {
      createEpisodeMutation.mutate(payload);
    }
  };

  const handleDeleteEpisodeConfirm = () => {
    if (deleteEpisodeId) {
      deleteEpisodeMutation.mutate(deleteEpisodeId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!series) {
    return <div className="py-20 text-center text-surface-300">Series not found</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/series')}
          className="rounded-lg p-2 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <Tv size={20} className="text-brand-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">{series.title}</h2>
            <p className="text-xs text-surface-300">Manage Seasons & Episodes</p>
          </div>
        </div>
        
        <div className="ml-auto flex gap-2">
          <Button
            variant="outline"
            icon={<PlusCircle size={16} />}
            onClick={() => {
              setSeasonNumber(seasons.length + 1);
              setShowSeasonModal(true);
            }}
          >
            New Season
          </Button>
          {seasons.length > 0 && (
            <Button
              variant="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                resetEpisodeForm();
                setShowEpisodeModal(true);
              }}
            >
              Add Episode
            </Button>
          )}
        </div>
      </div>

      {seasons.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <Tv size={48} className="text-surface-500 mb-4" />
          <h3 className="text-lg font-semibold text-white">No Seasons Found</h3>
          <p className="text-sm text-surface-300 max-w-sm mt-1">
            Seasons organize episodes. Please create a season first to start adding episodes.
          </p>
          <Button
            className="mt-6"
            icon={<PlusCircle size={16} />}
            onClick={() => setShowSeasonModal(true)}
          >
            Create Season 1
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Seasons Sidebar Selection */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-surface-400 px-1">Seasons</h3>
            <div className="flex flex-row overflow-x-auto gap-2 lg:flex-col lg:overflow-x-visible">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setSelectedSeasonId(season.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all shrink-0 lg:shrink ${
                    (selectedSeasonId === season.id || (!selectedSeasonId && seasons[0].id === season.id))
                      ? 'bg-brand-500 text-white font-medium shadow-md'
                      : 'bg-surface-800 text-surface-200 hover:bg-surface-700/50'
                  }`}
                >
                  <LayoutGrid size={16} />
                  <div className="truncate">
                    <p className="text-sm">{season.title || `Season ${season.seasonNumber}`}</p>
                    <p className={`text-xs ${
                      (selectedSeasonId === season.id || (!selectedSeasonId && seasons[0].id === season.id))
                        ? 'text-white/80'
                        : 'text-surface-400'
                    }`}>
                      {season.episodes?.length || 0} episodes
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Episodes List View */}
          <div className="lg:col-span-3">
            <Card padding={false}>
              <div className="border-b border-surface-700 p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">
                    {activeSeason?.title || `Season ${activeSeason?.seasonNumber || 1}`} Episodes
                  </h3>
                  <p className="text-xs text-surface-300">
                    Select and manage the list of episodes for this season.
                  </p>
                </div>
              </div>

              {!activeSeason?.episodes || activeSeason.episodes.length === 0 ? (
                <div className="py-16 text-center text-surface-400">
                  <Play size={24} className="mx-auto mb-2 text-surface-500" />
                  <p className="text-sm">No episodes in this season yet</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    icon={<Plus size={16} />}
                    onClick={() => {
                      resetEpisodeForm();
                      setShowEpisodeModal(true);
                    }}
                  >
                    Add First Episode
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-surface-700 bg-surface-850">
                  {activeSeason.episodes.map((ep: any) => {
                    const videoAsset = ep.videoAssets?.[0] || (series.videoAssets?.find((v: any) => v.episodeId === ep.id));
                    const hasVideo = !!videoAsset?.masterUrl;
                    return (
                      <div key={ep.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-surface-750/30 transition-all">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded">
                              EP {ep.episodeNumber}
                            </span>
                            <h4 className="font-semibold text-white truncate">{ep.title}</h4>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              ep.status === 'published' ? 'bg-green-500/10 text-green-400' : 'bg-surface-600 text-surface-400'
                            }`}>
                              {ep.status.toUpperCase()}
                            </span>
                            {ep.isPremium && (
                              <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-500">
                                Premium
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs text-surface-300 line-clamp-2">{ep.description || 'No description provided.'}</p>
                          {videoAsset && (
                            <p className="mt-1 text-[11px] text-green-400 flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                              Video: {videoAsset.originalFilename || 'Ready'}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2 shrink-0">
                          <Button
                            size="xs"
                            variant={hasVideo ? 'ghost' : 'outline'}
                            icon={<Video size={14} />}
                            onClick={() => setUploadingEpisode(ep)}
                          >
                            {hasVideo ? 'Replace Video' : 'Upload Video'}
                          </Button>
                          <button
                            onClick={() => handleEditEpisodeClick(ep)}
                            className="rounded-lg p-2 text-surface-400 hover:bg-surface-700 hover:text-white transition-colors"
                            title="Edit Episode"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteEpisodeId(ep.id)}
                            className="rounded-lg p-2 text-surface-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            title="Delete Episode"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Season Creation Modal */}
      {showSeasonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowSeasonModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-2xl animate-slide-up">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Season</h3>
            <form onSubmit={handleSeasonSubmit} className="space-y-4">
              <Input
                label="Season Number"
                type="number"
                value={seasonNumber}
                onChange={(e) => setSeasonNumber(Number(e.target.value))}
                required
              />
              <Input
                label="Season Title (Optional)"
                placeholder="e.g. The Beginning"
                value={seasonTitle}
                onChange={(e) => setSeasonTitle(e.target.value)}
              />
              <Textarea
                label="Description (Optional)"
                placeholder="e.g. Season details..."
                value={seasonDescription}
                onChange={(e) => setSeasonDescription(e.target.value)}
              />
              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowSeasonModal(false)}>Cancel</Button>
                <Button type="submit" loading={createSeasonMutation.isPending}>Create Season</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Episode Edit/Create Modal */}
      {showEpisodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEpisodeModal(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-2xl animate-slide-up overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-semibold text-white mb-4">
              {isEditingEpisode ? 'Edit Episode' : 'Add New Episode'}
            </h3>
            <form onSubmit={handleEpisodeSubmit} className="space-y-4">
              <Input
                label="Episode Number"
                type="number"
                value={epNumber}
                onChange={(e) => setEpNumber(Number(e.target.value))}
                required
              />
              <Input
                label="Episode Title"
                placeholder="e.g. Episode 1 Name"
                value={epTitle}
                onChange={(e) => setEpTitle(e.target.value)}
                required
              />
              <Textarea
                label="Description"
                placeholder="Provide a summary of the episode..."
                value={epDescription}
                onChange={(e) => setEpDescription(e.target.value)}
              />
              <Input
                label="Duration (seconds)"
                type="number"
                hint="e.g. 2700 = 45m"
                value={epDuration}
                onChange={(e) => setEpDuration(Number(e.target.value))}
              />
              
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">Publish Status</label>
                <select
                  value={epStatus}
                  onChange={(e) => setEpStatus(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="processing">Processing</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="epIsPremium"
                  checked={epIsPremium}
                  onChange={(e) => setEpIsPremium(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-700 bg-surface-900 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="epIsPremium" className="text-sm text-surface-200 cursor-pointer select-none">
                  Premium Episode (requires active subscription)
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowEpisodeModal(false)}>Cancel</Button>
                <Button type="submit" loading={createEpisodeMutation.isPending || updateEpisodeMutation.isPending}>
                  {isEditingEpisode ? 'Save Changes' : 'Add Episode'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Uploader Modal */}
      {uploadingEpisode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setUploadingEpisode(null)} />
          <div className="relative z-10 w-full max-w-2xl rounded-xl border border-surface-700 bg-surface-800 p-6 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between border-b border-surface-700 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Upload Video Asset</h3>
                <p className="text-xs text-surface-300">
                  Uploading for: <strong>EP {uploadingEpisode.episodeNumber} — {uploadingEpisode.title}</strong>
                </p>
              </div>
              <button
                onClick={() => setUploadingEpisode(null)}
                className="text-surface-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <VideoUploader
              content={series}
              episodeId={uploadingEpisode.id}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['content', seriesId] });
                toast.success('Episode video uploaded successfully!');
                setUploadingEpisode(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Delete Episode Confirm */}
      <ConfirmDialog
        open={!!deleteEpisodeId}
        title="Delete Episode"
        description="Are you sure you want to permanently delete this episode? This will also remove the associated video files and transcoding logs."
        confirmLabel="Delete Permanently"
        danger
        onConfirm={handleDeleteEpisodeConfirm}
        onCancel={() => setDeleteEpisodeId(null)}
      />
    </div>
  );
}
