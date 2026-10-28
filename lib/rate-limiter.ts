interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 menit

/**
 * Memeriksa apakah percobaan autentikasi melebihi batas (rate limiting).
 */
export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - record.count,
  };
}

/**
 * Mencatat kegagalan login untuk akun target.
 */
export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
  } else {
    record.count += 1;
  }
}

/**
 * Mereset catatan percobaan login setelah autentikasi berhasil.
 */
export function resetLoginRateLimit(key: string): void {
  loginAttempts.delete(key);
}
