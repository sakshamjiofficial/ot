import React, { useCallback, useState } from 'react';
import { useDropzone }    from 'react-dropzone';
import { Upload, X, Film, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useUploader }    from '@/hooks/useUploader';
import { useUploadStore } from '@/stores/upload.store';
import { uploadApi }      from '@/api/endpoints';
import { Button, ProgressBar, StatusBadge } from '@/components/UI';
import { formatBytes, formatDuration, timeAgo } from '@/utils/cn';
import { cn } from '@/utils/cn';
import toast from 'react-hot-toast';
import type { Content } from '@/types';

interface VideoUploaderProps {
  content:   Content;
  episodeId?: string;
  onSuccess?: (videoAssetId: string) => void;
}

export default function VideoUploader({ content, episodeId, onSuccess }: VideoUploaderProps) {
  const uploads  = useUploadStore((s) => s.uploads);
  const { removeUpload } = useUploadStore();

  const { upload, cancel, isUploading } = useUploader({
    contentId:    content.id,
    episodeId,
    contentTitle: content.title,
    onComplete:   (videoAssetId, jobId) => onSuccess?.(videoAssetId),
  });

  const onDrop = useCallback(async (accepted: File[]) => {
    if (!accepted.length) return;
    const file = accepted[0];
    await upload(file);
  }, [upload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4':        ['.mp4'],
      'video/x-matroska': ['.mkv'],
      'video/quicktime':  ['.mov'],
      'video/x-msvideo':  ['.avi'],
      'video/webm':       ['.webm'],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  // Filter uploads for this content
  const contentUploads = Object.values(uploads).filter(
    (u) => u.contentId === content.id && (episodeId ? u.contentTitle === content.title : true),
  );

  const handleRetry = async (videoAssetId: string) => {
    try {
      await uploadApi.retryJob(videoAssetId);
      toast.success('Job re-queued for transcoding');
    } catch {
      toast.error('Failed to retry job');
    }
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed',
          'cursor-pointer transition-all duration-200 py-12 px-8',
          isDragActive
            ? 'border-brand-500 bg-brand-500/5 scale-[1.01]'
            : 'border-surface-500 hover:border-surface-400 hover:bg-surface-700/30',
          isUploading && 'pointer-events-none opacity-60',
        )}
      >
        <input {...getInputProps()} />

        <div className={cn(
          'mb-4 rounded-full p-4 transition-colors',
          isDragActive ? 'bg-brand-500/20 text-brand-400' : 'bg-surface-700 text-surface-300',
        )}>
          <Upload size={32} />
        </div>

        <p className="text-base font-medium text-white">
          {isDragActive ? 'Drop to upload' : 'Drag & drop video file here'}
        </p>
        <p className="mt-1 text-sm text-surface-300">
          or <span className="text-brand-400 hover:underline">browse files</span>
        </p>
        <p className="mt-3 text-xs text-surface-400">
          MP4, MKV, MOV, AVI, WebM — up to 5 GB
        </p>
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-surface-800/80 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-brand-400">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-medium">Uploading…</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload Items */}
      {contentUploads.length > 0 && (
        <div className="space-y-3">
          {contentUploads.map((item) => (
            <UploadProgressCard
              key={item.id}
              item={item}
              onCancel={cancel}
              onRetry={() => item.videoAssetId && handleRetry(item.videoAssetId)}
              onDismiss={() => removeUpload(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Upload Progress Card ─────────────────────────────────────

function UploadProgressCard({
  item, onCancel, onRetry, onDismiss,
}: {
  item:      ReturnType<typeof useUploadStore.getState>['uploads'][string];
  onCancel:  () => void;
  onRetry:   () => void;
  onDismiss: () => void;
}) {
  const isActive      = item.status === 'uploading' || item.status === 'preparing' || item.status === 'completing';
  const isTranscoding = item.status === 'transcoding' || item.status === 'queued';
  const isDone        = item.status === 'done';
  const isError       = item.status === 'error';

  const elapsedSecs = item.completedAt
    ? Math.round((item.completedAt - item.startedAt) / 1000)
    : Math.round((Date.now() - item.startedAt) / 1000);

  return (
    <div className={cn(
      'rounded-xl border p-4 transition-all',
      isDone   ? 'border-green-500/20 bg-green-500/5'   :
      isError  ? 'border-red-500/20   bg-red-500/5'     :
      'border-surface-600 bg-surface-700',
    )}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          'mt-0.5 shrink-0 rounded-lg p-2',
          isDone   ? 'bg-green-500/20 text-green-400' :
          isError  ? 'bg-red-500/20   text-red-400'   :
          'bg-surface-600 text-surface-300',
        )}>
          {isDone  ? <CheckCircle2 size={18} /> :
           isError ? <AlertCircle size={18} />   :
           isTranscoding ? <Loader2 size={18} className="animate-spin" /> :
           <Film size={18} />}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-white">{item.filename}</p>
            <StatusBadge status={item.status} />
          </div>

          <p className="mt-0.5 text-xs text-surface-300">
            {formatBytes(item.fileSize)}
            {elapsedSecs > 0 && ` · ${formatDuration(elapsedSecs)}`}
          </p>

          {/* Upload progress */}
          {isActive && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-surface-300">
                <span>{item.status === 'preparing' ? 'Preparing…' : item.status === 'completing' ? 'Completing…' : 'Uploading to cloud'}</span>
                <span>{item.progress}%</span>
              </div>
              <ProgressBar value={item.progress} color="brand" />
            </div>
          )}

          {/* Transcode progress */}
          {isTranscoding && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-surface-300">
                <span>
                  {item.status === 'queued' ? 'Waiting in encoding queue…' : 'Transcoding to HLS…'}
                </span>
                <span>{item.transProgress}%</span>
              </div>
              <ProgressBar
                value={item.transProgress}
                color={item.status === 'queued' ? 'yellow' : 'blue'}
              />
            </div>
          )}

          {/* Error message */}
          {isError && item.errorMessage && (
            <p className="mt-2 text-xs text-red-400">{item.errorMessage}</p>
          )}

          {/* Done message */}
          {isDone && (
            <p className="mt-1 text-xs text-green-400">
              ✓ Ready to stream · {timeAgo(new Date(item.completedAt!).toISOString())}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 gap-1">
          {isActive && (
            <button
              onClick={onCancel}
              className="rounded-lg p-1.5 text-surface-300 hover:bg-surface-600 hover:text-red-400 transition-colors"
              title="Cancel upload"
            >
              <X size={14} />
            </button>
          )}
          {isError && (
            <button
              onClick={onRetry}
              className="rounded-lg p-1.5 text-surface-300 hover:bg-surface-600 hover:text-brand-400 transition-colors"
              title="Retry transcoding"
            >
              <RefreshCw size={14} />
            </button>
          )}
          {(isDone || isError) && (
            <button
              onClick={onDismiss}
              className="rounded-lg p-1.5 text-surface-300 hover:bg-surface-600 hover:text-white transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
