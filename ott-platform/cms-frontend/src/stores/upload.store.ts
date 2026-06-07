import { create } from 'zustand';

export type UploadStatus =
  | 'idle' | 'preparing' | 'uploading' | 'completing'
  | 'queued' | 'transcoding' | 'done' | 'error';

export interface UploadItem {
  id:           string;          // local uuid
  filename:     string;
  fileSize:     number;
  contentId?:   string;
  episodeId?:   string;
  contentTitle: string;
  status:       UploadStatus;
  progress:     number;          // 0-100 (upload progress)
  transProgress: number;         // 0-100 (transcode progress)
  videoAssetId?: string;
  jobId?:        string;
  errorMessage?: string;
  startedAt:     number;
  completedAt?:  number;
}

interface UploadState {
  uploads:   Record<string, UploadItem>;
  addUpload: (item: UploadItem) => void;
  updateUpload: (id: string, patch: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  uploads: {},

  addUpload: (item) =>
    set((s) => ({ uploads: { ...s.uploads, [item.id]: item } })),

  updateUpload: (id, patch) =>
    set((s) => ({
      uploads: {
        ...s.uploads,
        [id]: s.uploads[id] ? { ...s.uploads[id], ...patch } : s.uploads[id],
      },
    })),

  removeUpload: (id) =>
    set((s) => {
      const next = { ...s.uploads };
      delete next[id];
      return { uploads: next };
    }),

  clearCompleted: () =>
    set((s) => ({
      uploads: Object.fromEntries(
        Object.entries(s.uploads).filter(([, v]) => v.status !== 'done'),
      ),
    })),
}));
