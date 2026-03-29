/**
 * Base error class for git ignore operations
 */
export class GitIgnoreError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'GitIgnoreError';
  }
}

/**
 * Error thrown when .gitignore file cannot be read
 */
export class GitIgnoreReadError extends GitIgnoreError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'GitIgnoreReadError';
  }
}

/**
 * Error thrown when .gitignore file cannot be written
 */
export class GitIgnoreWriteError extends GitIgnoreError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'GitIgnoreWriteError';
  }
}

/**
 * Error thrown when there are permission issues with .gitignore file
 */
export class GitIgnorePermissionError extends GitIgnoreError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'GitIgnorePermissionError';
  }
}