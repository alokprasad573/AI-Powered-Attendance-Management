import "server-only";

interface BucketEntry {
  timestamps: number[];
}

const MAX_TRACKED_KEYS = 2000;
const buckets = new Map<string, BucketEntry>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

/**
 * Lightweight sliding-window server-side rate limiter to protect sensitive
 * biometric verification and email OTP endpoints from brute-force and SMTP abuse.
 */
export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number; now?: number }
): RateLimitResult {
  const now = options.now ?? Date.now();
  const windowStart = now - options.windowMs;

  if (buckets.size >= MAX_TRACKED_KEYS && !buckets.has(key)) {
    // Evict stale entries first to keep memory bounded
    for (const [k, entry] of buckets.entries()) {
      const active = entry.timestamps.filter((ts) => ts > windowStart);
      if (active.length === 0) {
        buckets.delete(k);
      } else {
        entry.timestamps = active;
      }
      if (buckets.size < MAX_TRACKED_KEYS * 0.8) {
        break;
      }
    }
    if (buckets.size >= MAX_TRACKED_KEYS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) {
        buckets.delete(oldestKey);
      }
    }
  }

  const entry = buckets.get(key) ?? { timestamps: [] };
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  if (entry.timestamps.length >= options.limit) {
    const oldestInWindow = entry.timestamps[0] ?? now;
    const retryAfterMs = Math.max(1000, oldestInWindow + options.windowMs - now);
    buckets.set(key, entry);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
      remaining: 0,
    };
  }

  entry.timestamps.push(now);
  buckets.set(key, entry);

  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: Math.max(0, options.limit - entry.timestamps.length),
  };
}

export function resetRateLimitBuckets(): void {
  buckets.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}
