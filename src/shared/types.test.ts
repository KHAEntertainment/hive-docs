import { describe, it, expect } from 'vitest'
import type { Document, MarkdownFile } from './types'

describe('Types', () => {
  it('should define Document interface correctly', () => {
    const doc: Document = {
      id: 'test-id',
      title: 'Test Document',
      content: 'Test content',
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    expect(doc.id).toBe('test-id')
    expect(doc.title).toBe('Test Document')
    expect(doc.content).toBe('Test content')
  })

  it('should define MarkdownFile interface correctly', () => {
    const file: MarkdownFile = {
      path: '/test/file.md',
      name: 'file.md',
      content: '# Test',
      size: 100,
      ignored: false
    }
    
    expect(file.path).toBe('/test/file.md')
    expect(file.name).toBe('file.md')
    expect(file.ignored).toBe(false)
  })
})