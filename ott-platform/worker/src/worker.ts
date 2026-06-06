import 'dotenv/config';
import { Worker, Queue, QueueEvents, Job } from 'bullmq';
import * as http   from 'http';
import * as client from 'prom-client';
import { logger }  from './utils/logger';
import { processTranscodeJob } from './processors/transcode.processor';
import { closePool }           from './services/db.service';
import { QUEUES, JOBS }        from './types/job.types';

// ─── Redis connection ─────────────────────────────────────────
const redisConnection = {
  host:     process.env.REDIS_HOST     || 'redis',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,   // Required for BullMQ workers
  enableReadyCheck: false,
};

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);

// ─── Prometheus metrics ───────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'ott_worker_' });

const jobsProcessed = new client.Counter({
  name:       'ott_worker_jobs_processed_total',
  help:       'Total transcoding jobs processed',
  labelNames: ['status'],
  registers:  [register],
});

const jobDuration = new client.Histogram({
  name:       'ott_worker_job_duration_seconds',
  help:       'Transcoding job duration in seconds',
  labelNames: ['status'],
  buckets:    [30, 60, 120, 300, 600, 1200, 1800, 3600],
  registers:  [register],
});

const activeJobs = new client.Gauge({
  name:      'ott_worker_active_jobs',
  help:      'Currently processing jobs',
  registers: [register],
});

const queueDepth = new client.Gauge({
  name:      'ott_worker_queue_depth',
  help:      'Waiting jobs in transcoding queue',
  registers: [register],
});

// ─── Worker ───────────────────────────────────────────────────

const worker = new Worker(
  QUEUES.TRANSCODE,
  async (job: Job) => {
    const start = Date.now();
    activeJobs.inc();

    try {
      logger.info(`Processing job ${job.id} (attempt ${job.attemptsMade + 1})`, {
        name: job.name,
        data: { jobId: job.data.jobId, contentId: job.data.contentId },
      });

      if (job.name !== JOBS.TRANSCODE_VIDEO) {
        throw new Error(`Unknown job name: ${job.name}`);
      }

      const result = await processTranscodeJob(job);

      jobsProcessed.inc({ status: 'completed' });
      jobDuration.observe(
        { status: 'completed' },
        (Date.now() - start) / 1000,
      );

      return result;

    } catch (err) {
      jobsProcessed.inc({ status: 'failed' });
      jobDuration.observe(
        { status: 'failed' },
        (Date.now() - start) / 1000,
      );
      throw err;

    } finally {
      activeJobs.dec();
    }
  },
  {
    connection:  redisConnection,
    concurrency: CONCURRENCY,

    // ── Retry config ───────────────────────────────────────
    // BullMQ handles retries; our processor marks DB accordingly
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 500 },

    // Stall detection: if a job hasn't heartbeated in 5 min, mark stalled
    stalledInterval: 5 * 60 * 1000,
    maxStalledCount: 2,

    // Lock duration (must be > max expected job duration)
    lockDuration: 60 * 60 * 1000,    // 1 hour
    lockRenewTime: 15 * 60 * 1000,   // renew every 15 min
  },
);

// ─── Queue Events (logging + metrics) ────────────────────────

const queueEvents = new QueueEvents(QUEUES.TRANSCODE, {
  connection: redisConnection,
});

queueEvents.on('waiting', ({ jobId }) => {
  logger.debug(`Job waiting: ${jobId}`);
});

queueEvents.on('active', ({ jobId, prev }) => {
  logger.info(`Job active: ${jobId} (was: ${prev})`);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info(`Job completed: ${jobId}`);
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job failed: ${jobId} — ${failedReason}`);
});

queueEvents.on('stalled', ({ jobId }) => {
  logger.warn(`Job stalled: ${jobId}`);
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`Job ${jobId} progress: ${data}%`);
});

// ─── Worker event handlers ────────────────────────────────────

worker.on('error', (err) => {
  logger.error('Worker error', { error: err.message, stack: err.stack });
});

worker.on('failed', (job, err) => {
  if (job) {
    logger.error(`Job ${job.id} failed after ${job.attemptsMade} attempts: ${err.message}`);
  }
});

// ─── Queue depth polling ──────────────────────────────────────
const transcodeQueue = new Queue(QUEUES.TRANSCODE, { connection: redisConnection });

setInterval(async () => {
  try {
    const counts = await transcodeQueue.getJobCounts('waiting', 'delayed', 'active');
    queueDepth.set(counts.waiting + counts.delayed);
  } catch {
    // Non-fatal
  }
}, 30_000);

// ─── Metrics HTTP server (Prometheus scrape endpoint) ─────────
const metricsServer = http.createServer(async (req, res) => {
  if (req.url === '/metrics') {
    res.setHeader('Content-Type', register.contentType);
    res.end(await register.metrics());
  } else if (req.url === '/health') {
    const isReady = !worker.closing;
    res.statusCode = isReady ? 200 : 503;
    res.end(JSON.stringify({ status: isReady ? 'ok' : 'closing' }));
  } else {
    res.statusCode = 404;
    res.end('Not found');
  }
});

const METRICS_PORT = parseInt(process.env.METRICS_PORT || '9091', 10);
metricsServer.listen(METRICS_PORT, () => {
  logger.info(`Metrics server listening on :${METRICS_PORT}`);
});

// ─── Graceful Shutdown ────────────────────────────────────────

async function shutdown(signal: string) {
  logger.info(`Received ${signal} — graceful shutdown started`);

  // Stop accepting new jobs
  await worker.close();
  logger.info('Worker closed — no new jobs accepted');

  // Close queue event listeners
  await queueEvents.close();
  await transcodeQueue.close();

  // Close DB pool
  await closePool();

  // Close metrics server
  metricsServer.close(() => {
    logger.info('Metrics server closed');
    process.exit(0);
  });

  // Force exit after 30s if still hanging
  setTimeout(() => {
    logger.error('Forced exit after shutdown timeout');
    process.exit(1);
  }, 30_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

logger.info(`OTT Transcoding Worker started`, {
  concurrency: CONCURRENCY,
  queue:       QUEUES.TRANSCODE,
  pid:         process.pid,
});
