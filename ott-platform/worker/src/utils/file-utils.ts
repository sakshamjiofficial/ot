import * as fs    from 'fs-extra';
import * as path  from 'path';
import * as os    from 'os';
import { logger } from './logger';

const WORK_DIR = process.env.WORK_DIR || '/tmp/worker';

/**
 * Creates an isolated temp directory for a job.
 * Returns the path; caller must clean up with cleanupJobDir().
 */
export async function createJobWorkDir(jobId: string): Promise<string> {
  const dir = path.join(WORK_DIR, jobId);
  await fs.ensureDir(dir);
  await fs.ensureDir(path.join(dir, 'input'));
  await fs.ensureDir(path.join(dir, 'output'));
  await fs.ensureDir(path.join(dir, 'thumbnails'));
  await fs.ensureDir(path.join(dir, 'subtitles'));
  return dir;
}

/**
 * Deletes the job work directory completely.
 */
export async function cleanupJobDir(jobId: string): Promise<void> {
  const dir = path.join(WORK_DIR, jobId);
  try {
    await fs.remove(dir);
    logger.info(`Cleaned up work dir: ${dir}`);
  } catch (err) {
    logger.warn(`Failed to clean up work dir ${dir}: ${err.message}`);
  }
}

/**
 * Returns the input video path for a job.
 */
export function inputPath(jobId: string, filename = 'input.mp4'): string {
  return path.join(WORK_DIR, jobId, 'input', filename);
}

/**
 * Returns the output directory for HLS files.
 */
export function outputDir(jobId: string): string {
  return path.join(WORK_DIR, jobId, 'output');
}

/**
 * Returns the thumbnails directory.
 */
export function thumbnailsDir(jobId: string): string {
  return path.join(WORK_DIR, jobId, 'thumbnails');
}

/**
 * Returns the subtitles directory.
 */
export function subtitlesDir(jobId: string): string {
  return path.join(WORK_DIR, jobId, 'subtitles');
}

/**
 * Get total size of all files under a directory.
 */
export async function getDirSize(dir: string): Promise<number> {
  let total = 0;
  const items = await fs.readdir(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      total += await getDirSize(fullPath);
    } else {
      const stat = await fs.stat(fullPath);
      total += stat.size;
    }
  }
  return total;
}

/**
 * Lists all .ts segment files in an output rendition directory.
 */
export async function listSegments(dir: string): Promise<string[]> {
  const files = await fs.readdir(dir);
  return files.filter((f) => f.endsWith('.ts')).map((f) => path.join(dir, f));
}

/**
 * Available disk space in bytes at the given path.
 */
export async function getFreeDiskBytes(checkPath = '/tmp'): Promise<number> {
  try {
    const { execSync } = require('child_process');
    const out = execSync(`df -B1 ${checkPath} | tail -1`, { encoding: 'utf8' });
    const parts = out.trim().split(/\s+/);
    return parseInt(parts[3], 10);  // "Available" column
  } catch {
    return Infinity;
  }
}
