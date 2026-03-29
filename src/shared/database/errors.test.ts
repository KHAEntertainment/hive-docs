import { describe, it, expect, vi } from 'vitest';
import { DatabaseError, DatabaseErrorType, RetryManager } from './errors.js';

describe('DatabaseError', () => {
  it('should create error from SQLite BUSY error', () => {
    const sqliteError = { code: 'SQLITE_BUSY', message: 'database is locked' };
    const dbError = DatabaseError.fromSQLiteError(sqliteError);

    expect(dbError.type).toBe(DatabaseErrorType.BUSY_TIMEOUT);
    expect(dbError.retryable).toBe(true);
    expect(dbError.message).toContain('Database is busy');
  });

  it('should create error from SQLite CORRUPT error', () => {
    const sqliteError = { code: 'SQLITE_CORRUPT', message: 'database disk image is malformed' };
    const dbError = DatabaseError.fromSQLiteError(sqliteError);

    expect(dbError.type).toBe(DatabaseErrorType.CORRUPTION_DETECTED);
    expect(dbError.retryable).toBe(false);
    expect(dbError.message).toContain('Database corruption detected');
  });

  it('should create error from SQLite FULL error', () => {
    const sqliteError = { code: 'SQLITE_FULL', message: 'database or disk is full' };
    const dbError = DatabaseError.fromSQLiteError(sqliteError);

    expect(dbError.type).toBe(DatabaseErrorType.DISK_FULL);
    expect(dbError.retryable).toBe(false);
  });

  it('should handle unknown SQLite errors', () => {
    const sqliteError = { code: 'SQLITE_UNKNOWN', message: 'unknown error' };
    const dbError = DatabaseError.fromSQLiteError(sqliteError);

    expect(dbError.type).toBe(DatabaseErrorType.QUERY_FAILED);
    expect(dbError.retryable).toBe(false);
  });

  it('should detect corruption from message content', () => {
    const sqliteError = { message: 'database is corrupt' };
    const dbError = DatabaseError.fromSQLiteError(sqliteError);

    expect(dbError.type).toBe(DatabaseErrorType.CORRUPTION_DETECTED);
    expect(dbError.retryable).toBe(false);
  });
});

describe('RetryManager', () => {
  it('should succeed on first attempt', async () => {
    const retryManager = new RetryManager();
    const operation = vi.fn().mockResolvedValue('success');

    const result = await retryManager.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const retryManager = new RetryManager({ maxAttempts: 3, baseDelay: 1 });
    const retryableError = new DatabaseError(
      DatabaseErrorType.BUSY_TIMEOUT,
      'Database is busy',
      undefined,
      true
    );

    const operation = vi.fn()
      .mockRejectedValueOnce(retryableError)
      .mockRejectedValueOnce(retryableError)
      .mockResolvedValue('success');

    const result = await retryManager.execute(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const retryManager = new RetryManager();
    const nonRetryableError = new DatabaseError(
      DatabaseErrorType.CORRUPTION_DETECTED,
      'Database is corrupt',
      undefined,
      false
    );

    const operation = vi.fn().mockRejectedValue(nonRetryableError);

    await expect(retryManager.execute(operation)).rejects.toThrow('Database is corrupt');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw last error after max attempts', async () => {
    const retryManager = new RetryManager({ maxAttempts: 2, baseDelay: 1 });
    const retryableError = new DatabaseError(
      DatabaseErrorType.BUSY_TIMEOUT,
      'Database is busy',
      undefined,
      true
    );

    const operation = vi.fn().mockRejectedValue(retryableError);

    await expect(retryManager.execute(operation)).rejects.toThrow('Database is busy');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should use custom retry condition', async () => {
    const retryManager = new RetryManager({ maxAttempts: 3, baseDelay: 1 });
    const customError = new Error('Custom error');

    const operation = vi.fn()
      .mockRejectedValueOnce(customError)
      .mockResolvedValue('success');

    // Custom retry condition that retries on any error
    const shouldRetry = () => true;

    const result = await retryManager.execute(operation, shouldRetry);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should calculate exponential backoff delays', async () => {
    const retryManager = new RetryManager({ 
      maxAttempts: 4, 
      baseDelay: 100, 
      backoffMultiplier: 2,
      maxDelay: 500
    });

    const retryableError = new DatabaseError(
      DatabaseErrorType.BUSY_TIMEOUT,
      'Database is busy',
      undefined,
      true
    );

    const operation = vi.fn().mockRejectedValue(retryableError);
    const startTime = Date.now();

    await expect(retryManager.execute(operation)).rejects.toThrow();

    const duration = Date.now() - startTime;
    // Should have delays of approximately 100ms, 200ms, 400ms
    // Total should be at least 700ms but allow for some variance
    expect(duration).toBeGreaterThan(600);
    expect(operation).toHaveBeenCalledTimes(4);
  });
});