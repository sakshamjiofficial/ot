import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Plus, Edit2, Trash2, Search, ArrowUpDown, RefreshCw } from 'lucide-react';
import { contentApi } from '@/api/endpoints';
import { Card, Button, Input, ConfirmDialog, Spinner, EmptyState } from '@/components/UI';
import toast from 'react-hot-toast';
import type { Genre } from '@/types';

export default function GenresPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteGenreId, setDeleteGenreId] = useState<number | null>(null);
  
  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [genreName, setGenreName] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);

  // Queries
  const { data: genres = [], isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['genres'],
    queryFn: contentApi.listGenres,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: contentApi.createGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      toast.success('Genre created successfully');
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to create genre';
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name, sortOrder }: { id: number; name: string; sortOrder?: number }) =>
      contentApi.updateGenre(id, name, sortOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      toast.success('Genre updated successfully');
      resetForm();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to update genre';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: contentApi.deleteGenre,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['genres'] });
      toast.success('Genre deleted successfully');
      setDeleteGenreId(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to delete genre';
      toast.error(msg);
      setDeleteGenreId(null);
    },
  });

  const resetForm = () => {
    setIsEditing(false);
    setEditingId(null);
    setGenreName('');
    setSortOrder(0);
  };

  const handleEdit = (genre: Genre) => {
    setIsEditing(true);
    setEditingId(genre.id);
    setGenreName(genre.name);
    setSortOrder(genre.sortOrder || 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genreName.trim()) {
      toast.error('Genre name is required');
      return;
    }

    if (isEditing && editingId !== null) {
      updateMutation.mutate({ id: editingId, name: genreName.trim(), sortOrder });
    } else {
      createMutation.mutate(genreName.trim());
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteGenreId !== null) {
      deleteMutation.mutate(deleteGenreId);
    }
  };

  // Filter genres
  const filteredGenres = genres.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Genre Management</h1>
          <p className="text-sm text-surface-300">Create, edit and organize genres for movies and TV series.</p>
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
        {/* Genre Form */}
        <div className="lg:col-span-1">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <Tag className="text-brand-500" size={20} />
              <h3 className="font-semibold text-white">
                {isEditing ? 'Edit Genre' : 'Create Genre'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Genre Name"
                placeholder="e.g. Science Fiction"
                value={genreName}
                onChange={(e) => setGenreName(e.target.value)}
                required
              />
              
              {isEditing && (
                <Input
                  label="Sort Order"
                  type="number"
                  placeholder="0"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                  hint="Lower numbers appear first in lists"
                />
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  className="flex-1"
                  loading={createMutation.isPending || updateMutation.isPending}
                  icon={isEditing ? <Edit2 size={16} /> : <Plus size={16} />}
                >
                  {isEditing ? 'Update Genre' : 'Add Genre'}
                </Button>
                {isEditing && (
                  <Button type="button" variant="ghost" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </Card>
        </div>

        {/* Genre List */}
        <div className="lg:col-span-2">
          <Card className="flex flex-col h-full" padding={false}>
            {/* Search filter */}
            <div className="border-b border-surface-700 p-4">
              <Input
                placeholder="Search genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={18} />}
              />
            </div>

            {isLoading ? (
              <div className="flex flex-1 items-center justify-center py-20">
                <Spinner size="lg" />
              </div>
            ) : filteredGenres.length === 0 ? (
              <div className="flex-1">
                <EmptyState
                  icon={<Tag size={40} />}
                  title="No Genres Found"
                  description={
                    searchQuery
                      ? `No genres matched your search query "${searchQuery}"`
                      : 'Create a genre using the form on the left to get started.'
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-surface-200">
                  <thead className="bg-surface-750 text-xs font-semibold uppercase text-surface-300 border-b border-surface-750">
                    <tr>
                      <th className="px-6 py-4">Sort</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Slug</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700">
                    {filteredGenres.map((genre) => (
                      <tr key={genre.id} className="hover:bg-surface-700/50 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-brand-400">
                          {genre.sortOrder ?? 0}
                        </td>
                        <td className="px-6 py-4 font-medium text-white">
                          {genre.name}
                        </td>
                        <td className="px-6 py-4 text-surface-400 font-mono text-xs">
                          {genre.slug}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleEdit(genre)}
                              className="rounded-lg p-1.5 text-surface-300 hover:bg-surface-600 hover:text-white transition-colors"
                              title="Edit Genre"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteGenreId(genre.id)}
                              className="rounded-lg p-1.5 text-surface-300 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                              title="Delete Genre"
                            >
                              <Trash2 size={16} />
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

      <ConfirmDialog
        open={deleteGenreId !== null}
        title="Delete Genre"
        description="Are you sure you want to delete this genre? Any content linked to this genre will have it removed, but the content itself will not be deleted."
        confirmLabel="Delete"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteGenreId(null)}
      />
    </div>
  );
}
