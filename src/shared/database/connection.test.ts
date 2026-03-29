import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DatabaseConnection } from './connection.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('DatabaseConnection', () => {
  let connection: DatabaseConnection;
  let testDbPath: string;

  beforeEach(async () => {
    // Create a temporary database file for testing
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hive-docs-test-'));
    testDbPath = path.join(tempDir, 'test.sqlite');
    
    connection = new DatabaseConnection({
      path: testDbPath,
      enableWAL: true,
      busyTimeout: 5000
    });
  });

  afterEach(async () => {
    if (connection) {
      await connection.disconnect();
    }
    
    // Clean up test database
    try {
      if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
      }
      // Also clean up WAL and SHM files
      const walPath = testDbPath + '-wal';
      const shmPath = testDbPath + '-shm';
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      
      // Remove temp directory
      const tempDir = path.dirname(testDbPath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  it('should connect to database successfully', async () => {
    await connection.connect();
    expect(connection.isHealthy()).toBe(true);
  });

  it('should create database file if it does not exist', async () => {
    expect(fs.existsSync(testDbPath)).toBe(false);
    await connection.connect();
    expect(fs.existsSync(testDbPath)).toBe(true);
  });

  it('should execute SQL statements', async () => {
    await connection.connect();
    
    await connection.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    await connection.run('INSERT INTO test (name) VALUES (?)', ['test-name']);
    
    const result = await connection.get<{ id: number; name: string }>('SELECT * FROM test WHERE name = ?', ['test-name']);
    expect(result).toBeDefined();
    expect(result?.name).toBe('test-name');
  });

  it('should handle transactions', async () => {
    await connection.connect();
    
    await connection.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    
    // Test successful transaction
    await connection.beginTransaction();
    await connection.run('INSERT INTO test (name) VALUES (?)', ['test1']);
    await connection.commit();
    
    let results = await connection.all<{ name: string }>('SELECT name FROM test');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('test1');
    
    // Test rollback
    await connection.beginTransaction();
    await connection.run('INSERT INTO test (name) VALUES (?)', ['test2']);
    await connection.rollback();
    
    results = await connection.all<{ name: string }>('SELECT name FROM test');
    expect(results).toHaveLength(1); // Should still be 1, not 2
  });

  it('should handle connection errors gracefully', async () => {
    const invalidConnection = new DatabaseConnection({
      path: '/invalid/path/database.sqlite'
    });
    
    await expect(invalidConnection.connect()).rejects.toThrow();
  });

  it('should throw error when executing queries without connection', async () => {
    await expect(connection.run('SELECT 1')).rejects.toThrow('Database not connected');
    await expect(connection.get('SELECT 1')).rejects.toThrow('Database not connected');
    await expect(connection.all('SELECT 1')).rejects.toThrow('Database not connected');
  });

  it('should disconnect properly', async () => {
    await connection.connect();
    expect(connection.isHealthy()).toBe(true);
    
    await connection.disconnect();
    expect(connection.isHealthy()).toBe(false);
  });
});