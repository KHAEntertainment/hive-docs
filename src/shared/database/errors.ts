export enum DatabaseErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  QUERY_FAILED = 'QUERY_FAILED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  CORRUPTION_DETECTED = 'CORRUPTION_DETECTED',
  BUSY_TIMEOUT = 'BUSY_TIMEOUT',
  DISK_FULL = 'DISK_FULL',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH'
}

export class DatabaseError extends Error {
  public readonly type: DatabaseErrorType;
  public readonly originalError?: Error;
  public readonly retryable: boolean;

  constructor(
    type: DatabaseErrorType, 
    message: string, 
    originalError?: Error,
    retryable: boolean = false
  ) {
    super(message);
    this.name = 'DatabaseError';
    this.type = type;
    this.originalError = originalError;
    this.retryable = retryable;
  }

  static fromSQLiteError(error: any): DatabaseError {
    const message = error.message || error.toString();
    const code = error.code || error.errno;

    // Map SQLite error codes to our error types
    switch (code) {
      case 'SQLITE_BUSY':
      case 'SQLITE_LOCKED':
        return new DatabaseError(
          DatabaseErrorType.BUSY_TIMEOUT,
          `Database is busy: ${message}`,
          error,
          true // Retryable
        );

      case 'SQLITE_CORRUPT':
      case 'SQLITE_NOTADB':
        return new DatabaseError(
          DatabaseErrorType.CORRUPTION_DETECTED,
          `Database corruption detected: ${message}`,
          error,
          false
        );

      case 'SQLITE_FULL':
        return new DatabaseError(
          DatabaseErrorType.DISK_FULL,
          `Disk full: ${message}`,
          error,
          false
        );

      case 'SQLITE_PERM':
      case 'SQLITE_READONLY':
        return new DatabaseError(
          DatabaseErrorType.PERMISSION_DENIED,
          `Permission denied: ${message}`,
          error,
          false
        );

      case 'SQLITE_CANTOPEN':
        return new DatabaseError(
          DatabaseErrorType.CONNECTION_FAILED,
          `Cannot open database: ${message}`,
          error,
          true
        );

      case 'SQLITE_SCHEMA':
        return new DatabaseError(
          DatabaseErrorType.SCHEMA_MISMATCH,
          `Schema mismatch: ${message}`,
          error,
          false
        );

      default:
        // Check message content for additional error detection
        if (message.includes('database is locked')) {
          return new DatabaseError(
            DatabaseErrorType.BUSY_TIMEOUT,
            message,
            error,
            true
          );
        }

        if (message.includes('corrupt') || message.includes('malformed')) {
          return new DatabaseError(
            DatabaseErrorType.CORRUPTION_DETECTED,
            message,
            error,
            false
          );
        }

        return new DatabaseError(
          DatabaseErrorType.QUERY_FAILED,
          message,
          error,
          false
        );
    }
  }
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class RetryManager {
  private options: RetryOptions;

  constructor(options: Partial<RetryOptions> = {}) {
    this.options = {
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 5000,
      backoffMultiplier: 2,
      ...options
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: any) => boolean = (error) => error instanceof DatabaseError && error.retryable
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry on the last attempt or if error is not retryable
        if (attempt === this.options.maxAttempts || !shouldRetry(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.options.baseDelay * Math.pow(this.options.backoffMultiplier, attempt - 1),
          this.options.maxDelay
        );

        console.warn(`Database operation failed (attempt ${attempt}/${this.options.maxAttempts}), retrying in ${delay}ms:`, error instanceof Error ? error.message : String(error));
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}