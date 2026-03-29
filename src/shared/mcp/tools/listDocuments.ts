import { MCPTool, MCPToolContext } from '../types.js';

export const listDocumentsTool: MCPTool = {
  definition: {
    name: 'listDocuments',
    description: 'List documents with optional filtering, sorting, and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of documents to return (default: 50, max: 100)',
          minimum: 1,
          maximum: 100
        },
        offset: {
          type: 'number',
          description: 'Number of documents to skip for pagination (default: 0)',
          minimum: 0
        },
        sortBy: {
          type: 'string',
          enum: ['title', 'createdAt', 'updatedAt'],
          description: 'Field to sort by (default: updatedAt)'
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order (default: desc)'
        },
        tags: {
          type: 'array',
          items: {
            type: 'string'
          },
          description: 'Filter by documents containing any of these tags'
        },
        createdAfter: {
          type: 'string',
          format: 'date-time',
          description: 'Filter documents created after this date (ISO 8601 format)'
        },
        createdBefore: {
          type: 'string',
          format: 'date-time',
          description: 'Filter documents created before this date (ISO 8601 format)'
        },
        updatedAfter: {
          type: 'string',
          format: 'date-time',
          description: 'Filter documents updated after this date (ISO 8601 format)'
        },
        updatedBefore: {
          type: 'string',
          format: 'date-time',
          description: 'Filter documents updated before this date (ISO 8601 format)'
        }
      }
    }
  },
  handler: async (args: {
    limit?: number;
    offset?: number;
    sortBy?: 'title' | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    tags?: string[];
    createdAfter?: string;
    createdBefore?: string;
    updatedAfter?: string;
    updatedBefore?: string;
  }, context: MCPToolContext) => {
    const {
      limit = 50,
      offset = 0,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      tags,
      createdAfter,
      createdBefore,
      updatedAfter,
      updatedBefore
    } = args;

    // Validate parameters
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new Error('Limit must be a number between 1 and 100');
    }

    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('Offset must be a non-negative number');
    }

    if (tags && !Array.isArray(tags)) {
      throw new Error('Tags must be an array of strings');
    }

    // Validate and parse date filters
    const filter: any = {};
    
    if (tags && tags.length > 0) {
      filter.tags = tags;
    }

    try {
      if (createdAfter) {
        filter.createdAfter = new Date(createdAfter);
        if (isNaN(filter.createdAfter.getTime())) {
          throw new Error('Invalid createdAfter date format');
        }
      }

      if (createdBefore) {
        filter.createdBefore = new Date(createdBefore);
        if (isNaN(filter.createdBefore.getTime())) {
          throw new Error('Invalid createdBefore date format');
        }
      }

      if (updatedAfter) {
        filter.updatedAfter = new Date(updatedAfter);
        if (isNaN(filter.updatedAfter.getTime())) {
          throw new Error('Invalid updatedAfter date format');
        }
      }

      if (updatedBefore) {
        filter.updatedBefore = new Date(updatedBefore);
        if (isNaN(filter.updatedBefore.getTime())) {
          throw new Error('Invalid updatedBefore date format');
        }
      }
    } catch (error) {
      throw new Error(`Invalid date format: ${error instanceof Error ? error.message : 'Unknown date error'}`);
    }

    try {
      const documents = await context.documentManager.listDocuments({
        limit,
        offset,
        sortBy,
        sortOrder,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      });

      const formattedDocuments = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''), // Preview only
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        tags: doc.tags || [],
        metadata: doc.metadata || {}
      }));

      // Get total count for pagination info
      const totalCount = await context.documentManager.getDocumentCount();

      return {
        success: true,
        documents: formattedDocuments,
        pagination: {
          limit,
          offset,
          total: totalCount,
          hasMore: offset + documents.length < totalCount
        },
        sorting: {
          sortBy,
          sortOrder
        },
        filters: filter
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(`Failed to list documents: ${errorMessage}`);
    }
  }
};