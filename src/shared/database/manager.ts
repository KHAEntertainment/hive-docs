import path from 'path';
import { DatabaseConnection, DatabaseConfig } from './connection.js';
import { SchemaManager } from './schema.js';
import { DatabaseRecoveryManager, RecoveryResult } from './recovery.js';
import { DatabaseError, DatabaseErrorType } from './errors.js';

export interface DatabaseManagerConfig {
  workspacePath: string;
  databaseName?: string;
  enableWAL?: boolean;
  busyTimeout?: number;
}

export class DatabaseManager {
  private connection: DatabaseConnection;
  private schema: SchemaManager;
  private recovery: DatabaseRecoveryManager;
  private config: DatabaseManagerConfig;

  constructor(config: DatabaseManagerConfig) {
    this.config = {
      databaseName: 'hive-docs.sqlite',
      enableWAL: true,
      busyTimeout: 30000,
      ...config
    };

    const dbPath = path.join(this.config.workspacePath, '.hive-docs', this.config.databaseName!);
    
    const connectionConfig: DatabaseConfig = {
      path: dbPath,
      enableWAL: this.config.enableWAL,
      busyTimeout: this.config.busyTimeout
    };

    this.connection = new DatabaseConnection(connectionConfig);
    this.schema = new SchemaManager(this.connection);
    this.recovery = new DatabaseRecoveryManager(this.connection, this.schema, {
      backupDirectory: path.join(this.config.workspacePath, '.hive-docs', 'backups'),
      maxBackups: 5,
      autoRecover: true
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.connection.connect();
      
      // Check for corruption before proceeding
      const isCorrupt = await this.recovery.detectCorruption();
      if (isCorrupt) {
        console.warn('Database corruption detected, attempting recovery...');
        const recoveryResult = await this.recovery.attemptRecovery();
        
        if (!recoveryResult.success) {
          throw new DatabaseError(
            DatabaseErrorType.CORRUPTION_DETECTED,
            `Database recovery failed: ${recoveryResult.message}`
          );
        }
        
        console.log(`Database recovered: ${recoveryResult.message}`);
      }
      
      await this.schema.initialize();
      
      // Validate schema after initialization
      const isValid = await this.schema.validateSchema();
      if (!isValid) {
        throw new Error('Database schema validation failed after initialization');
      }

      // Create initial backup after successful initialization
      try {
        await this.recovery.createBackup('initialization');
      } catch (backupError) {
        console.warn('Failed to create initialization backup:', backupError);
        // Don't fail initialization if backup fails
      }

      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      
      // If it's a database error, try recovery one more time
      if (error instanceof DatabaseError && error.type === DatabaseErrorType.CORRUPTION_DETECTED) {
        console.log('Attempting emergency recovery...');
        try {
          const recoveryResult = await this.recovery.attemptRecovery();
          if (recoveryResult.success) {
            console.log('Emergency recovery successful, retrying initialization...');
            return this.initialize(); // Recursive retry
          }
        } catch (recoveryError) {
          console.error('Emergency recovery failed:', recoveryError);
        }
      }
      
      throw error;
    }
  }

  async close(): Promise<void> {
    await this.connection.disconnect();
  }

  getConnection(): DatabaseConnection {
    return this.connection;
  }

  getSchemaManager(): SchemaManager {
    return this.schema;
  }

  getRecoveryManager(): DatabaseRecoveryManager {
    return this.recovery;
  }

  async healthCheck(): Promise<{
    connected: boolean;
    schemaValid: boolean;
    path: string;
    version: number;
  }> {
    const connected = this.connection.isHealthy();
    let schemaValid = false;
    let version = 0;

    if (connected) {
      try {
        schemaValid = await this.schema.validateSchema();
        version = await this.schema.getCurrentVersion();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }

    return {
      connected,
      schemaValid,
      path: this.connection.getPath(),
      version
    };
  }

  async backup(backupPath: string): Promise<void> {
    if (!this.connection.isHealthy()) {
      throw new Error('Cannot backup: database not connected');
    }

    // Use SQLite's backup API through a simple VACUUM INTO command
    await this.connection.run(`VACUUM INTO '${backupPath}'`);
    console.log(`Database backed up to: ${backupPath}`);
  }

  async getDatabaseInfo(): Promise<{
    path: string;
    size: number;
    pageCount: number;
    pageSize: number;
    walMode: boolean;
  }> {
    const dbPath = this.connection.getPath();
    
    const [
      pageSizeResult,
      pageCountResult,
      journalModeResult
    ] = await Promise.all([
      this.connection.get<{ page_size: number }>('PRAGMA page_size'),
      this.connection.get<{ page_count: number }>('PRAGMA page_count'),
      this.connection.get<{ journal_mode: string }>('PRAGMA journal_mode')
    ]);

    const pageSize = pageSizeResult?.page_size || 0;
    const pageCount = pageCountResult?.page_count || 0;
    const size = pageSize * pageCount;
    const walMode = journalModeResult?.journal_mode?.toLowerCase() === 'wal';

    return {
      path: dbPath,
      size,
      pageCount,
      pageSize,
      walMode
    };
  }
}