import { execSync } from 'child_process';
import { logger }   from './logger';

const MAX_CPU_PERCENT = parseInt(process.env.MAX_CPU_PERCENT || '80', 10);
const MAX_MEM_PERCENT = parseInt(process.env.MAX_MEM_PERCENT || '85', 10);
const CHECK_INTERVAL_MS = 5000;

/**
 * Returns current system CPU utilisation (1-second sample).
 */
export function getCpuPercent(): number {
  try {
    // Linux: read /proc/stat twice
    const readStat = () => {
      const line  = require('fs').readFileSync('/proc/stat', 'utf8').split('\n')[0];
      const parts = line.split(/\s+/).slice(1).map(Number);
      const idle  = parts[3];
      const total = parts.reduce((a, b) => a + b, 0);
      return { idle, total };
    };

    const s1 = readStat();
    // Busy-wait 100ms for delta
    const end = Date.now() + 100;
    while (Date.now() < end) {}
    const s2 = readStat();

    const idleDelta  = s2.idle  - s1.idle;
    const totalDelta = s2.total - s1.total;
    return totalDelta === 0 ? 0 : Math.round((1 - idleDelta / totalDelta) * 100);
  } catch {
    return 0;
  }
}

/**
 * Returns RAM utilisation percentage.
 */
export function getMemPercent(): number {
  try {
    const content = require('fs').readFileSync('/proc/meminfo', 'utf8');
    const parse   = (key: string) => {
      const match = content.match(new RegExp(`${key}:\\s+(\\d+)`));
      return match ? parseInt(match[1], 10) : 0;
    };
    const total     = parse('MemTotal');
    const available = parse('MemAvailable');
    return total === 0 ? 0 : Math.round((1 - available / total) * 100);
  } catch {
    return 0;
  }
}

/**
 * Waits until CPU and RAM are below configured thresholds.
 * Used before starting a new FFmpeg process.
 */
export async function waitForResources(jobId?: string): Promise<void> {
  const log = jobId ? logger.child({ jobId }) : logger;

  while (true) {
    const cpu = getCpuPercent();
    const mem = getMemPercent();

    if (cpu < MAX_CPU_PERCENT && mem < MAX_MEM_PERCENT) {
      return;
    }

    log.warn(`Resource gate: CPU=${cpu}% MEM=${mem}% — waiting ${CHECK_INTERVAL_MS}ms`);
    await new Promise((r) => setTimeout(r, CHECK_INTERVAL_MS));
  }
}

/**
 * Returns true if system is safe to start encoding.
 */
export function resourcesAvailable(): boolean {
  return getCpuPercent() < MAX_CPU_PERCENT && getMemPercent() < MAX_MEM_PERCENT;
}
