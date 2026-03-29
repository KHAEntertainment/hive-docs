import { describe, it, expect } from 'vitest';
import { 
  GitIgnoreError, 
  GitIgnoreReadError, 
  GitIgnoreWriteError, 
  GitIgnorePermissionError 
} from './errors';

describe('Git Ignore Errors', () => {
  describe('GitIgnoreError', () => {
    it('should create error with message', () => {
      const error = new GitIgnoreError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('GitIgnoreError');
      expect(error.cause).toBeUndefined();
    });

    it('should create error with message and cause', () => {
      const cause = new Error('Original error');
      const error = new GitIgnoreError('Test error', cause);
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('GitIgnoreError');
      expect(error.cause).toBe(cause);
    });
  });

  describe('GitIgnoreReadError', () => {
    it('should create read error with correct name', () => {
      const error = new GitIgnoreReadError('Read failed');
      expect(error.message).toBe('Read failed');
      expect(error.name).toBe('GitIgnoreReadError');
      expect(error).toBeInstanceOf(GitIgnoreError);
    });

    it('should create read error with cause', () => {
      const cause = new Error('File not found');
      const error = new GitIgnoreReadError('Read failed', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('GitIgnoreWriteError', () => {
    it('should create write error with correct name', () => {
      const error = new GitIgnoreWriteError('Write failed');
      expect(error.message).toBe('Write failed');
      expect(error.name).toBe('GitIgnoreWriteError');
      expect(error).toBeInstanceOf(GitIgnoreError);
    });

    it('should create write error with cause', () => {
      const cause = new Error('Disk full');
      const error = new GitIgnoreWriteError('Write failed', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('GitIgnorePermissionError', () => {
    it('should create permission error with correct name', () => {
      const error = new GitIgnorePermissionError('Permission denied');
      expect(error.message).toBe('Permission denied');
      expect(error.name).toBe('GitIgnorePermissionError');
      expect(error).toBeInstanceOf(GitIgnoreError);
    });

    it('should create permission error with cause', () => {
      const cause = new Error('EACCES');
      const error = new GitIgnorePermissionError('Permission denied', cause);
      expect(error.cause).toBe(cause);
    });
  });
});