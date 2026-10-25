import { Injectable } from '@nestjs/common';
import { AppError } from '../common/app-error';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

@Injectable()
export class LoginThrottle {
  private readonly failures = new Map<string, number[]>();

  assert(key: string): void {
    const recent = this.prune(key);
    if (recent.length >= MAX_FAILURES) {
      const retryAfterSeconds = Math.max(1, Math.ceil((WINDOW_MS - (Date.now() - recent[0])) / 1000));
      throw new AppError(
        'rate_limited',
        429,
        'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.',
        [],
        retryAfterSeconds,
      );
    }
  }

  recordFailure(key: string): void {
    const recent = this.prune(key);
    recent.push(Date.now());
    this.failures.set(key, recent);
  }

  clear(key: string): void {
    this.failures.delete(key);
  }

  private prune(key: string): number[] {
    const now = Date.now();
    return (this.failures.get(key) ?? []).filter((timestamp) => now - timestamp < WINDOW_MS);
  }
}
