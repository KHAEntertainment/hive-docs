// Shared constants between web app and extension

export const DEFAULT_IGNORE_RULES = [
  'README.md',
  'readme.md',
  'CHANGELOG.md',
  'changelog.md',
  'LICENSE.md',
  'license.md',
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**'
];

export const DATABASE_FILE_NAME = 'hive-docs.sqlite';
export const DEFAULT_MCP_PORT = 3001;