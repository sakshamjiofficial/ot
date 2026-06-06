import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Gauge,
  Histogram,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  // ─── HTTP Metrics ──────────────────────────────────────
  readonly httpRequestsTotal = new Counter({
    name:       'http_requests_total',
    help:       'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
    registers:  [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name:       'http_request_duration_seconds',
    help:       'HTTP request latency',
    labelNames: ['method', 'route', 'status_code'],
    buckets:    [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers:  [this.registry],
  });

  // ─── Streaming Metrics ─────────────────────────────────
  readonly activeStreams = new Gauge({
    name:      'ott_active_streams',
    help:      'Current number of active HLS streams',
    registers: [this.registry],
  });

  readonly streamStartsTotal = new Counter({
    name:       'ott_stream_starts_total',
    help:       'Total stream start events',
    labelNames: ['content_type', 'resolution'],
    registers:  [this.registry],
  });

  readonly streamErrorsTotal = new Counter({
    name:       'ott_stream_errors_total',
    help:       'Total streaming errors',
    labelNames: ['error_type'],
    registers:  [this.registry],
  });

  // ─── Transcoding Metrics ───────────────────────────────
  readonly transcodingJobsTotal = new Counter({
    name:       'ott_transcoding_jobs_total',
    help:       'Total transcoding jobs',
    labelNames: ['status'],
    registers:  [this.registry],
  });

  readonly transcodingQueueDepth = new Gauge({
    name:      'ott_transcoding_queue_depth',
    help:      'Current transcoding queue depth',
    registers: [this.registry],
  });

  readonly transcodingDuration = new Histogram({
    name:    'ott_transcoding_duration_seconds',
    help:    'Time to complete a full transcoding job',
    buckets: [30, 60, 120, 300, 600, 1200, 1800, 3600],
    registers: [this.registry],
  });

  // ─── Auth Metrics ──────────────────────────────────────
  readonly authLoginsTotal = new Counter({
    name:       'ott_auth_logins_total',
    help:       'Total login attempts',
    labelNames: ['result'],             // success | failure
    registers:  [this.registry],
  });

  readonly authRegistrationsTotal = new Counter({
    name:      'ott_auth_registrations_total',
    help:      'Total user registrations',
    registers: [this.registry],
  });

  // ─── Business Metrics ─────────────────────────────────
  readonly activeSubscriptions = new Gauge({
    name:       'ott_active_subscriptions',
    help:       'Current active subscription count',
    labelNames: ['plan'],
    registers:  [this.registry],
  });

  readonly paymentTotal = new Counter({
    name:       'ott_payments_total',
    help:       'Total payment events',
    labelNames: ['status', 'method'],
    registers:  [this.registry],
  });

  readonly watchEventsTotal = new Counter({
    name:       'ott_watch_events_total',
    help:       'Total watch/heartbeat events',
    labelNames: ['content_type'],
    registers:  [this.registry],
  });

  // ─── Storage Metrics ───────────────────────────────────
  readonly r2UploadBytesTotal = new Counter({
    name:      'ott_r2_upload_bytes_total',
    help:      'Total bytes uploaded to R2',
    registers: [this.registry],
  });

  onModuleInit() {
    // Collect Node.js default metrics (CPU, memory, event loop)
    collectDefaultMetrics({
      register: this.registry,
      prefix:   'node_',
    });
  }

  // ─── Helpers ───────────────────────────────────────────

  incrementActiveStreams()  { this.activeStreams.inc(); }
  decrementActiveStreams()  { this.activeStreams.dec(); }

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number) {
    const labels = { method, route, status_code: String(statusCode) };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs / 1000);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
