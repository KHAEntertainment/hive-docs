import { MCPTool, MCPToolContext } from '../types.js';

export const searchDocumentsTool: MCPTool = {
  definition: {
    name: 'searchDocuments',
    description: 'Search documents using full-text search with optional filters and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query to match against document titles and content'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20, max: 100)',
          minimum: 1,
          maximum: 100
        },
        offset: {
          type: 'number',
          description: 'Number of results to skip for pagination (default: 0)',
          minimum: 0
        },
        includeContent: {
          type: 'boolean',
          description: 'Whether to include full content or just previews (default: false)'
        }
      },
      required: ['query']
    }
  },
  handler: async (args: {
    query: string;
    limit?: number;
    offset?: number;
    includeContent?: boolean;
  }, context: MCPToolContext) => {
    const { query, limit = 20, offset = 0, includeContent = false } = args;
    
    // Validate required fields
    if (!query || typeof query !== 'string') {
      throw new Error('Search query is required and must be a string');
    }

    if (query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    // Validate optional fields
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new Error('Limit must be a number between 1 and 100');
    }

    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('Offset must be a non-negative number');
    }

    try {
      const searchResult = await context.documentManager.searchDocuments({
        query: query.trim(),
        limit,
        offset,
        includeContent
      });

      const documents = searchResult.documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        tags: doc.tags || [],
        metadata: doc.metadata || {}
      }));

      return {
        success: true,
        query: query.trim(),
        results: {
          documents,
          total: searchResult.total,
          hasMore: searchResult.hasMore,
          limit,
          offset
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to search documents: ${errorMessage}`);
    }
  }
};