import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from './connection.js';
import { SchemaManager } from './schema.js';
import { DatabaseRecoveryManager } from './recovery.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('DatabaseRecoveryManager', () => {
  let connection: DatabaseConnection;
  let schema: SchemaManager;
  let recovery: DatabaseRecoveryManager;
  let testDbPath: string;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-docs-recovery-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    
    connection = new DatabaseConnection({
      path: testDbPath,
      enableWAL: true
    });
    
    await connection.connect();
    schema = new SchemaManager(connection);
    await schema.initialize();
    
    recovery = new DatabaseRecoveryManager(connection, schema, {
      backupDirectory: path.join(tempDir, 'backups'),
      maxBackups: 3
    });
  });

  afterEach(async () => {
    if (connection) {
      await connection.disconnect();
    }
    
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('Backup Operations', () => {
    it('should create backup successfully', async () => {
      const backupPath = await recovery.createBackup('test');
      
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(backupPath).toContain('hive-docs-backup-');
      expect(backupPath).toContain('test.sqlite');
    });

    it('should create backup directory if it does not exist', async () => {
      const backupDir = path.join(tempDir, 'backups');
      expect(fs.existsSync(backupDir)).toBe(false);
      
      await recovery.createBackup('test');
      
      expect(fs.existsSync(backupDir)).toBe(true);
    });

    it('should cleanup old backups', async () => {
      // Create more backups than the limit
      await recovery.createBackup('backup1');
      await recovery.createBackup('backup2');
      await recovery.createBackup('backup3');
      await recovery.createBackup('backup4'); // This should trigger cleanup

      const backupInfo = await recovery.getBackupInfo();
      expect(backupInfo.length).toBeLessThanOrEqual(3);
    });

    it('should get backup information', async () => {
      await recovery.createBackup('test1');
      await recovery.createBackup('test2');

      const backupInfo = await recovery.getBackupInfo();
      
      expect(backupInfo.length).toBe(2);
      expect(backupInfo[0].name).toContain('test2'); // Should be sorted by date desc
      expect(backupInfo[1].name).toContain('test1');
      
      backupInfo.forEach(info => {
        expect(info.size).toBeGreaterThan(0);
        expect(info.created).toBeInstanceOf(Date);
        expect(fs.existsSync(info.path)).toBe(true);
      });
    });
  });

  describe('Corruption Detection', () => {
    it('should detect healthy database', async () => {
      const isCorrupt = await recovery.detectCorruption();
      expect(isCorrupt).toBe(false);
    });

    it('should detect corruption when integrity check fails', async () => {
      // We can't easily create a corrupted database in tests,
      // but we can test the detection logic by mocking
      const originalGet = connection.get;
      connection.get = async () => ({ integrity_check: 'corruption detected' });

      const isCorrupt = await recovery.detectCorruption();
      expect(isCorrupt).toBe(true);

      // Restore original method
      connection.get = originalGet;
    });

    it('should detect corruption when schema validation fails', async () => {
      // Mock schema validation to fail
      const originalValidate = schema.validateSchema;
      schema.validateSchema = async () => false;

      const isCorrupt = await recovery.detectCorruption();
      expect(isCorrupt).toBe(true);

      // Restore original method
      schema.validateSchema = originalValidate;
    });
  });

  describe('Recovery Operations', () => {
    it('should report no recovery needed for healthy database', async () => {
      const result = await recovery.attemptRecovery();
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('none');
      expect(result.message).toContain('no recovery needed');
    });

    it('should attempt backup recovery when corruption detected', async () => {
      // Create a backup first
      await recovery.createBackup('before-corruption');
      
      // Mock corruption detection
      const originalDetect = recovery.detectCorruption;
      let corruptionCallCount = 0;
      recovery.detectCorruption = async () => {
        corruptionCallCount++;
        // Return true for first call (initial detection), false after recovery
        return corruptionCallCount === 1;
      };

      const result = await recovery.attemptRecovery();
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('backup_restore');
      expect(result.backupUsed).toBeDefined();

      // Restore original method
      recovery.detectCorruption = originalDetect;
    });

    it('should attempt rebuild when no backups available', async () => {
      // Mock corruption detection
      const originalDetect = recovery.detectCorruption;
      let corruptionCallCount = 0;
      recovery.detectCorruption = async () => {
        corruptionCallCount++;
        // Return true for first call, false after rebuild
        return corruptionCallCount === 1;
      };

      const result = await recovery.attemptRecovery();
      
      expect(result.success).toBe(true);
      expect(result.method).toBe('rebuild');
      expect(result.message).toContain('rebuilt from scratch');

      // Restore original method
      recovery.detectCorruption = originalDetect;
    });
  });

  describe('Integration with Real Database Operations', () => {
    it('should maintain data integrity during backup and restore cycle', async () => {
      // Add some test data
      await connection.run(
        'INSERT INTO documents (id, title, content) VALUES (?, ?, ?)',
        ['test-1', 'Test Document', 'Test content']
      );

      // Create backup
      const backupPath = await recovery.createBackup('data-test');
      
      // Verify backup contains the data
      const backupConnection = new DatabaseConnection({ path: backupPath });
      await backupConnection.connect();
      
      const result = await backupConnection.get<{ title: string }>(
        'SELECT title FROM documents WHERE id = ?',
        ['test-1']
      );
      
      expect(result?.title).toBe('Test Document');
      await backupConnection.disconnect();
    });

    it('should handle concurrent access gracefully', async () => {
      // This test simulates concurrent operations
      const operations = Array.from({ length: 10 }, (_, i) => 
        connection.run(
          'INSERT INTO documents (id, title, content) VALUES (?, ?, ?)',
          [`test-${i}`, `Document ${i}`, `Content ${i}`]
        )
      );

      // All operations should complete successfully
      await Promise.all(operations);

      const count = await connection.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM documents'
      );
      expect(count?.count).toBe(10);
    });
  });
});