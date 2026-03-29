import { DatabaseConnection } from './connection.js';
import { SchemaManager } from './schema.js';
import { DatabaseError, DatabaseErrorType } from './errors.js';
import fs from 'fs';
import path from 'path';

export interface RecoveryOptions {
  backupDirectory?: string;
  maxBackups?: number;
  autoRecover?: boolean;
}

export interface RecoveryResult {
  success: boolean;
  method: 'none' | 'backup_restore' | 'rebuild' | 'manual_intervention';
  message: string;
  backupUsed?: string;
}

export class DatabaseRecoveryManager {
  private connection: DatabaseConnection;
  private schema: SchemaManager;
  private options: RecoveryOptions;

  constructor(
    connection: DatabaseConnection, 
    schema: SchemaManager,
    options: RecoveryOptions = {}
  ) {
    this.connection = connection;
    this.schema = schema;
    this.options = {
      maxBackups: 5,
      autoRecover: true,
      ...options
    };
  }

  async createBackup(reason: string = 'manual'): Promise<string> {
    const dbPath = this.connection.getPath();
    const backupDir = this.options.backupDirectory || path.join(path.dirname(dbPath), 'backups');
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `hive-docs-backup-${timestamp}-${reason}.sqlite`;
    const backupPath = path.join(backupDir, backupName);

    try {
      // Use SQLite's VACUUM INTO for atomic backup
      await this.connection.run(`VACUUM INTO '${backupPath}'`);
      
      // Clean up old backups
      await this.cleanupOldBackups(backupDir);
      
      console.log(`Database backup created: ${backupPath}`);
      return backupPath;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new DatabaseError(
        DatabaseErrorType.QUERY_FAILED,
        `Backup creation failed: ${error}`,
        error as Error
      );
    }
  }

  async detectCorruption(): Promise<boolean> {
    try {
      // Run integrity check
      const result = await this.connection.get<{ integrity_check: string }>(
        'PRAGMA integrity_check'
      );
      
      if (result?.integrity_check !== 'ok') {
        console.error('Database integrity check failed:', result?.integrity_check);
        return true;
      }

      // Check if we can read from main tables
      await this.connection.get('SELECT COUNT(*) FROM documents');
      await this.connection.get('SELECT COUNT(*) FROM schema_migrations');

      // Validate schema
      const schemaValid = await this.schema.validateSchema();
      if (!schemaValid) {
        console.error('Schema validation failed');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Corruption detection failed:', error);
      return true;
    }
  }

  async attemptRecovery(): Promise<RecoveryResult> {
    console.log('Attempting database recovery...');

    // First, try to detect the type of corruption
    const isCorrupt = await this.detectCorruption();
    
    if (!isCorrupt) {
      return {
        success: true,
        method: 'none',
        message: 'Database is healthy, no recovery needed'
      };
    }

    // Try recovery methods in order of preference
    const recoveryMethods = [
      () => this.recoverFromBackup(),
      () => this.rebuildFromScratch(),
    ];

    for (const method of recoveryMethods) {
      try {
        const result = await method();
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.warn('Recovery method failed:', error);
      }
    }

    return {
      success: false,
      method: 'manual_intervention',
      message: 'Automatic recovery failed. Manual intervention required.'
    };
  }

  private async recoverFromBackup(): Promise<RecoveryResult> {
    const backupDir = this.options.backupDirectory || path.join(path.dirname(this.connection.getPath()), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      throw new Error('No backup directory found');
    }

    // Find the most recent backup
    const backups = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.sqlite'))
      .map(file => ({
        name: file,
        path: path.join(backupDir, file),
        stats: fs.statSync(path.join(backupDir, file))
      }))
      .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

    if (backups.length === 0) {
      throw new Error('No backups found');
    }

    const latestBackup = backups[0];
    console.log(`Attempting to restore from backup: ${latestBackup.name}`);

    // Test the backup first
    const testConnection = new DatabaseConnection({ path: latestBackup.path });
    try {
      await testConnection.connect();
      const testSchema = new SchemaManager(testConnection);
      const isValid = await testSchema.validateSchema();
      await testConnection.disconnect();

      if (!isValid) {
        throw new Error('Backup file is also corrupted');
      }
    } catch (error) {
      throw new Error(`Backup validation failed: ${error}`);
    }

    // Close current connection
    await this.connection.disconnect();

    // Replace corrupted database with backup
    const dbPath = this.connection.getPath();
    const corruptedPath = `${dbPath}.corrupted.${Date.now()}`;
    
    // Move corrupted file aside
    fs.renameSync(dbPath, corruptedPath);
    
    // Copy backup to main location
    fs.copyFileSync(latestBackup.path, dbPath);

    // Reconnect and verify
    await this.connection.connect();
    const isHealthy = await this.detectCorruption();

    if (isHealthy) {
      // Recovery failed, restore original
      await this.connection.disconnect();
      fs.renameSync(corruptedPath, dbPath);
      await this.connection.connect();
      throw new Error('Restored database is still corrupted');
    }

    console.log('Database successfully restored from backup');
    return {
      success: true,
      method: 'backup_restore',
      message: `Database restored from backup: ${latestBackup.name}`,
      backupUsed: latestBackup.path
    };
  }

  private async rebuildFromScratch(): Promise<RecoveryResult> {
    console.log('Attempting to rebuild database from scratch...');

    const dbPath = this.connection.getPath();
    const corruptedPath = `${dbPath}.corrupted.${Date.now()}`;

    // Close connection and move corrupted file
    await this.connection.disconnect();
    fs.renameSync(dbPath, corruptedPath);

    // Create new database
    await this.connection.connect();
    await this.schema.initialize();

    // Verify new database
    const isHealthy = await this.detectCorruption();
    if (isHealthy) {
      throw new Error('Failed to create healthy database');
    }

    console.log('Database successfully rebuilt from scratch');
    return {
      success: true,
      method: 'rebuild',
      message: 'Database rebuilt from scratch. All data has been lost.'
    };
  }

  private async cleanupOldBackups(backupDir: string): Promise<void> {
    if (!this.options.maxBackups || this.options.maxBackups <= 0) {
      return;
    }

    try {
      const backups = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('hive-docs-backup-') && file.endsWith('.sqlite'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          stats: fs.statSync(path.join(backupDir, file))
        }))
        .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

      // Remove old backups beyond the limit
      const toDelete = backups.slice(this.options.maxBackups);
      for (const backup of toDelete) {
        fs.unlinkSync(backup.path);
        console.log(`Removed old backup: ${backup.name}`);
      }
    } catch (error) {
      console.warn('Failed to cleanup old backups:', error);
    }
  }

  async getBackupInfo(): Promise<Array<{
    name: string;
    path: string;
    size: number;
    created: Date;
  }>> {
    const backupDir = this.options.backupDirectory || path.join(path.dirname(this.connection.getPath()), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return [];
    }

    return fs.readdirSync(backupDir)
      .filter(file => file.startsWith('hive-docs-backup-') && file.endsWith('.sqlite'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
  }
}