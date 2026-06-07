import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image as ImageIcon, Plus, Edit2, Trash2, RefreshCw, Link2, Eye } from 'lucide-react';
import { bannersApi } from '@/api/endpoints';
import { Card, Button, Input, ConfirmDialog, Spinner, EmptyState } from '@/components/UI';
import toast from 'react-hot-toast';
import type { Banner } from '@/types';

export default function BannersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteBannerId, setDeleteBannerId] = useState<string | null>(null);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkType, setLinkType] = useState('movie');
  const [linkValue, setLinkValue] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);

  // Queries
  const { data: banners = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['banners'],
    queryFn: bannersApi.list,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: bannersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner created successfully');
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create banner';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => bannersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner updated successfully');
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update banner';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: bannersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      toast.success('Banner deleted successfully');
      setDeleteBannerId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete banner';
      toast.error(msg);
      setDeleteBannerId(null);
    },
  });

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setTitle('');
    setImageUrl('');
    setLinkType('movie');
    setLinkValue('');
    setSortOrder(0);
    setIsActive(true);
  };

  const handleEdit = (banner: Banner) => {
    setIsEditing(true);
    setEditingId(banner.id);
    setTitle(banner.title || '');
    setImageUrl(banner.imageUrl);
    setLinkType(banner.linkType || 'movie');
    setLinkValue(banner.linkValue || '');
    setSortOrder(banner.sortOrder || 0);
    setIsActive(banner.isActive);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      toast.error('Image URL is required');
      return;
    }

    const payload = {
      title: title.trim() || null,
      imageUrl: imageUrl.trim(),
      linkType: linkType || null,
      linkValue: linkValue.trim() || null,
      sortOrder: Number(sortOrder),
      isActive,
    };

    if (isEditing && editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteBannerId !== null) {
      deleteMutation.mutate(deleteBannerId);
    }
  };

  // Filter banners
  const filteredBanners = banners.filter((b) =>
    (b.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.imageUrl || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Banner Management</h1>
          <p className="text-sm text-surface-300">Create and organize hero banners that will display on the home screen.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            loading={isRefetching}
            icon={<RefreshCw size={16} />}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Banner Form */}
        <div className="lg:col-span-1">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <ImageIcon className="text-brand-500" size={20} />
              <h3 className="font-semibold text-white">
                {isEditing ? 'Edit Banner' : 'Create Banner'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Banner Title (Optional)"
                placeholder="e.g. Inception Movie Release"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <Input
                label="Image URL"
                placeholder="https://example.com/banner.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-surface-400">Link Type</label>
                <select
                  value={linkType}
                  onChange={(e) => setLinkType(e.target.value)}
                  className="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="movie">Movie Detail</option>
                  <option value="series">Series Detail</option>
                  <option value="genre">Genre List</option>
                  <option value="url">External URL</option>
                  <option value="none">No Link</option>
                </select>
              </div>

              {linkType !== 'none' && (
                <Input
                  label={linkType === 'url' ? 'External URL' : 'Resource ID (UUID) or Genre ID'}
                  placeholder={linkType === 'url' ? 'https://...' : 'e.g. UUID of the movie/series'}
                  value={linkValue}
                  onChange={(e) => setLinkValue(e.target.value)}
                  required
                />
              )}

              <Input
                label="Sort Order"
                type="number"
                placeholder="e.g. 1"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-surface-700 bg-surface-900 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="isActive" className="text-sm text-surface-200 cursor-pointer select-none">
                  Active (show on frontend)
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" variant="primary" className="flex-1" loading={createMutation.isPending || updateMutation.isPending}>
                  {isEditing ? 'Save Changes' : 'Create Banner'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Banner List */}
        <div className="lg:col-span-2">
          <Card padding={false}>
            {/* Search toolbar */}
            <div className="border-b border-surface-700 p-4">
              <Input
                placeholder="Search banners..."
                leftIcon={<SearchQueryIcon />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Spinner size="lg" />
              </div>
            ) : filteredBanners.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No banners found"
                  description={searchQuery ? 'Try matching another search query' : 'Create a banner on the left to get started.'}
                  icon={<ImageIcon size={32} />}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-surface-200">
                  <thead className="bg-surface-700/50 text-xs font-semibold uppercase tracking-wider text-surface-300">
                    <tr>
                      <th className="px-6 py-3">Image</th>
                      <th className="px-6 py-3">Title & Link</th>
                      <th className="px-6 py-3">Order</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700 bg-surface-800">
                    {filteredBanners.map((banner) => (
                      <tr key={banner.id} className="hover:bg-surface-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="h-16 w-28 overflow-hidden rounded-md bg-surface-900 border border-surface-700">
                            {banner.imageUrl ? (
                              <img src={banner.imageUrl} alt={banner.title || ''} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-surface-500">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">{banner.title || 'Untitled Banner'}</div>
                          {banner.linkType && banner.linkType !== 'none' && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-brand-400">
                              <Link2 size={12} />
                              <span>
                                {banner.linkType.toUpperCase()}: {banner.linkValue}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                          {banner.sortOrder}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            banner.isActive
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-surface-600 text-surface-400'
                          }`}>
                            {banner.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(banner)}
                              className="rounded p-1.5 text-surface-400 hover:bg-surface-600 hover:text-white transition-colors"
                              title="Edit Banner"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteBannerId(banner.id)}
                              className="rounded p-1.5 text-surface-400 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                              title="Delete Banner"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteBannerId}
        title="Delete Banner"
        description="Are you sure you want to permanently delete this banner? It will be removed from the home screen carousel."
        confirmLabel="Delete Banner"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteBannerId(null)}
      />
    </div>
  );
}

// Simple search icon component
function SearchQueryIcon() {
  return (
    <svg className="h-4 w-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
