import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { DatabaseError, RetryManager } from './errors';

export interface DatabaseConfig {
  path: string;
  enableWAL?: boolean;
  busyTimeout?: number;
}

export class DatabaseConnection {
  private db: Database | null = null;
  private config: DatabaseConfig;
  private isConnected = false;
  private retryManager: RetryManager;

  constructor(config: DatabaseConfig) {
    this.config = {
      enableWAL: true,
      busyTimeout: 30000,
      ...config
    };
    this.retryManager = new RetryManager({
      maxAttempts: 3,
      baseDelay: 100,
      maxDelay: 2000
    });
  }

  async connect(): Promise<void> {
    if (this.isConnected && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      // Ensure directory exists
      const dbDir = path.dirname(this.config.path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      this.db = new sqlite3.Database(this.config.path, (err) => {
        if (err) {
          reject(new Error(`Failed to connect to database: ${err.message}`));
          return;
        }

        this.isConnected = true;
        this.configureDatabase()
          .then(() => resolve())
          .catch(reject);
      });
    });
  }

  private async configureDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }

    const promises: Promise<void>[] = [];

    // Enable WAL mode for better concurrency
    if (this.config.enableWAL) {
      promises.push(this.run('PRAGMA journal_mode = WAL'));
    }

    // Set busy timeout
    promises.push(this.run(`PRAGMA busy_timeout = ${this.config.busyTimeout}`));

    // Enable foreign keys
    promises.push(this.run('PRAGMA foreign_keys = ON'));

    // Optimize for performance
    promises.push(this.run('PRAGMA synchronous = NORMAL'));
    promises.push(this.run('PRAGMA cache_size = 10000'));
    promises.push(this.run('PRAGMA temp_store = MEMORY'));

    await Promise.all(promises);
  }

  async disconnect(): Promise<void> {
    if (!this.db || !this.isConnected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.db!.close((err) => {
        if (err) {
          reject(new Error(`Failed to close database: ${err.message}`));
          return;
        }
        
        this.db = null;
        this.isConnected = false;
        resolve();
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<void> {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }

    return this.retryManager.execute(async () => {
      return new Promise<void>((resolve, reject) => {
        this.db!.run(sql, params, function(err) {
          if (err) {
            reject(DatabaseError.fromSQLiteError(err));
            return;
          }
          resolve();
        });
      });
    });
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }

    return this.retryManager.execute(async () => {
      return new Promise<T | undefined>((resolve, reject) => {
        this.db!.get(sql, params, (err, row) => {
          if (err) {
            reject(DatabaseError.fromSQLiteError(err));
            return;
          }
          resolve(row as T);
        });
      });
    });
  }

  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db || !this.isConnected) {
      throw new Error('Database not connected');
    }

    return this.retryManager.execute(async () => {
      return new Promise<T[]>((resolve, reject) => {
        this.db!.all(sql, params, (err, rows) => {
          if (err) {
            reject(DatabaseError.fromSQLiteError(err));
            return;
          }
          resolve(rows as T[]);
        });
      });
    });
  }

  async beginTransaction(): Promise<void> {
    await this.run('BEGIN TRANSACTION');
  }

  async commit(): Promise<void> {
    await this.run('COMMIT');
  }

  async rollback(): Promise<void> {
    await this.run('ROLLBACK');
  }

  isHealthy(): boolean {
    return this.isConnected && this.db !== null;
  }

  getPath(): string {
    return this.config.path;
  }
}