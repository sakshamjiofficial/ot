import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 }   from 'uuid';
import toast               from 'react-hot-toast';
import { uploadApi }       from '@/api/endpoints';
import { useUploadStore }  from '@/stores/upload.store';
import type { UploadedPart } from '@/types';

const CHUNK_SIZE    = 100 * 1024 * 1024;   // 100 MB per part (R2 min is 5 MB)
const MAX_PARALLEL  = 3;                    // parallel part uploads

interface UseUploaderOptions {
  contentId?:    string;
  episodeId?:    string;
  contentTitle:  string;
  onComplete?:   (videoAssetId: string, jobId?: string) => void;
  onError?:      (error: Error) => void;
}

export function useUploader(opts: UseUploaderOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const abortRef    = useRef<AbortController | null>(null);
  const { addUpload, updateUpload } = useUploadStore();

  const upload = useCallback(async (file: File) => {
    const localId   = uuidv4();
    const partCount = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));

    addUpload({
      id:           localId,
      filename:     file.name,
      fileSize:     file.size,
      contentId:    opts.contentId,
      contentTitle: opts.contentTitle,
      status:       'preparing',
      progress:     0,
      transProgress: 0,
      startedAt:    Date.now(),
    });

    setIsUploading(true);
    abortRef.current = new AbortController();

    try {
      // ── Step 1: initiate multipart upload ──────────────────
      updateUpload(localId, { status: 'preparing' });

      const initRes = await uploadApi.initiate({
        contentId: opts.contentId,
        episodeId: opts.episodeId,
        filename:  file.name,
        fileSize:  file.size,
        mimeType:  file.type || 'video/mp4',
        partCount,
      });

      updateUpload(localId, {
        status:       'uploading',
        videoAssetId: initRes.videoAssetId,
      });

      // ── Step 2: upload parts with concurrency control ──────
      const parts: UploadedPart[] = [];
      let   completedParts        = 0;

      // Process in batches of MAX_PARALLEL
      for (let batch = 0; batch < partCount; batch += MAX_PARALLEL) {
        const batchParts = Array.from(
          { length: Math.min(MAX_PARALLEL, partCount - batch) },
          (_, i) => batch + i,
        );

        await Promise.all(
          batchParts.map(async (partIdx) => {
            const partNumber = partIdx + 1;
            const start      = partIdx * CHUNK_SIZE;
            const end        = Math.min(start + CHUNK_SIZE, file.size);
            const chunk      = file.slice(start, end);
            const presignUrl = initRes.partUrls[partIdx];

            // PUT directly to R2 presigned URL
            const res = await fetch(presignUrl, {
              method:  'PUT',
              body:    chunk,
              signal:  abortRef.current?.signal,
              headers: { 'Content-Type': file.type || 'video/mp4' },
            });

            if (!res.ok) {
              throw new Error(`Part ${partNumber} upload failed: ${res.status}`);
            }

            const etag = res.headers.get('ETag') || res.headers.get('etag') || '';
            parts.push({ PartNumber: partNumber, ETag: etag.replace(/"/g, '') });

            completedParts++;
            const pct = Math.round((completedParts / partCount) * 100);
            updateUpload(localId, { progress: pct });
          }),
        );
      }

      // Sort parts by number (Promise.all may resolve out of order)
      parts.sort((a, b) => a.PartNumber - b.PartNumber);

      // ── Step 3: complete upload + auto-transcode ───────────
      updateUpload(localId, { status: 'completing', progress: 100 });

      const completeRes = await uploadApi.complete({
        uploadId:     initRes.uploadId,
        key:          initRes.key,
        videoAssetId: initRes.videoAssetId,
        parts,
        autoTranscode: true,
      });

      updateUpload(localId, {
        status:  'queued',
        jobId:   completeRes.jobId,
        progress: 100,
      });

      toast.success(`"${file.name}" uploaded — transcoding queued`);
      opts.onComplete?.(initRes.videoAssetId, completeRes.jobId);

      // ── Step 4: poll transcode progress ───────────────────
      if (initRes.videoAssetId) {
        pollTranscodeProgress(localId, initRes.videoAssetId);
      }

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        updateUpload(localId, { status: 'error', errorMessage: 'Upload cancelled' });
        toast('Upload cancelled', { icon: '🚫' });
      } else {
        const msg = err?.message || 'Upload failed';
        updateUpload(localId, { status: 'error', errorMessage: msg });
        toast.error(msg);
        opts.onError?.(err);
      }
    } finally {
      setIsUploading(false);
    }
  }, [opts, addUpload, updateUpload]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { upload, cancel, isUploading };
}

// ── Polling helper (runs outside component lifecycle) ──────────

function pollTranscodeProgress(localId: string, videoAssetId: string) {
  const { updateUpload } = useUploadStore.getState();

  let attempts = 0;
  const MAX_ATTEMPTS = 360;   // 30 min at 5s interval

  const poll = async () => {
    try {
      const job = await uploadApi.status(videoAssetId);

      const statusMap: Record<string, any> = {
        pending:    { status: 'queued',      transProgress: 0  },
        processing: { status: 'transcoding', transProgress: job.progress },
        completed:  { status: 'done',        transProgress: 100, completedAt: Date.now() },
        failed:     { status: 'error',       errorMessage: job.errorMessage },
        retrying:   { status: 'transcoding', transProgress: job.progress },
      };

      const patch = statusMap[job.status];
      if (patch) updateUpload(localId, patch);

      if (job.status === 'completed') {
        toast.success(`Transcoding complete!`);
        return;
      }
      if (job.status === 'failed') {
        toast.error(`Transcoding failed: ${job.errorMessage}`);
        return;
      }

    } catch {
      // Ignore polling errors — retry next interval
    }

    attempts++;
    if (attempts < MAX_ATTEMPTS) {
      setTimeout(poll, 5000);
    }
  };

  setTimeout(poll, 5000);
}
