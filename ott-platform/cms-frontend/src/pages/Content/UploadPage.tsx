import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery }               from '@tanstack/react-query';
import { ArrowLeft, Film, Tv }    from 'lucide-react';
import { contentApi }             from '@/api/endpoints';
import VideoUploader              from '@/components/VideoUploader/VideoUploader';
import { Card, StatusBadge, Spinner } from '@/components/UI';
import { formatDuration, formatBytes, formatDate } from '@/utils/cn';

export default function UploadPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: content, isLoading } = useQuery({
    queryKey: ['content', id],
    queryFn:  () => contentApi.getById(id!),
    enabled:  !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!content) {
    return (
      <div className="py-20 text-center text-surface-300">Content not found</div>
    );
  }

  const isMovie     = content.type === 'movie';
  const videoAsset  = content.videoAssets?.[0];
  const hasVideo    = !!videoAsset?.masterUrl;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 text-surface-300 hover:bg-surface-700 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          {isMovie
            ? <Film size={20} className="text-brand-400" />
            : <Tv size={20} className="text-brand-400" />}
          <div>
            <h2 className="text-lg font-semibold text-white">{content.title}</h2>
            <p className="text-xs text-surface-300">Upload Video</p>
          </div>
        </div>
        <div className="ml-auto">
          <StatusBadge status={content.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Upload Area */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="mb-4 font-semibold text-white">
              {hasVideo ? 'Replace Video File' : 'Upload Video File'}
            </h3>
            {hasVideo && (
              <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
                <p className="text-sm text-yellow-400">
                  ⚠ This content already has a processed video. Uploading a new file will replace it and trigger re-transcoding.
                </p>
              </div>
            )}
            <VideoUploader
              content={content}
              onSuccess={(videoAssetId) => {
                navigate(`/${isMovie ? 'movies' : 'series'}/${content.id}/edit`);
              }}
            />
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-5">

          {/* Content Info */}
          <Card>
            <h3 className="mb-3 font-semibold text-white">Content Details</h3>
            <div className="space-y-2 text-sm">
              <InfoRow label="Type"     value={content.type.toUpperCase()} />
              <InfoRow label="Language" value={content.language ? content.language.split(',').map((l) => l.toUpperCase().trim()).join(', ') : '—'} />
              <InfoRow label="Year"     value={content.releaseYear?.toString() || '—'} />
              <InfoRow label="Rating"   value={content.ageRating || '—'} />
              {content.durationSeconds && (
                <InfoRow label="Duration" value={formatDuration(content.durationSeconds)} />
              )}
              <InfoRow label="Premium"  value={content.isPremium ? 'Yes' : 'No'} />
            </div>
          </Card>

          {/* Existing Asset */}
          {videoAsset && (
            <Card>
              <h3 className="mb-3 font-semibold text-white">Current Video Asset</h3>
              <div className="space-y-2 text-sm">
                <InfoRow label="File" value={videoAsset.originalFilename || '—'} />
                {videoAsset.fileSizeBytes && (
                  <InfoRow label="Size" value={formatBytes(videoAsset.fileSizeBytes)} />
                )}
                {videoAsset.durationSeconds && (
                  <InfoRow label="Duration" value={formatDuration(videoAsset.durationSeconds)} />
                )}
                <InfoRow label="Uploaded" value={formatDate(videoAsset.createdAt)} />
              </div>

              {/* Renditions */}
              {videoAsset.renditions?.length > 0 && (
                <div className="mt-4 border-t border-surface-700 pt-4">
                  <p className="mb-2 text-xs font-medium text-surface-300">Available Renditions</p>
                  <div className="flex flex-wrap gap-2">
                    {videoAsset.renditions.map((r) => (
                      <span
                        key={r.id}
                        className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400"
                      >
                        {r.resolution}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtitles */}
              {videoAsset.subtitles?.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-surface-300">Subtitles</p>
                  <div className="flex flex-wrap gap-2">
                    {videoAsset.subtitles.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300"
                      >
                        {s.languageName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <h3 className="mb-3 font-semibold text-white">Upload Guide</h3>
            <ul className="space-y-2 text-xs text-surface-300">
              {[
                'Supported: MP4, MKV, MOV, AVI, WebM',
                'Max file size: 5 GB',
                'Recommended: H.264 MP4 for fastest encoding',
                'For best quality use 1080p source',
                'Multiple audio tracks in MKV will be extracted automatically',
                'Embedded subtitles (SRT/ASS) will be extracted to WebVTT',
                'Transcoding generates 1080p, 720p, 480p, 360p HLS',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-brand-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-surface-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
