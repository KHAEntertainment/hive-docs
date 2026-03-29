# Technology Stack

## Core Technologies

- **TypeScript**: Primary language for all code
- **React 18**: UI framework for web components
- **SQLite3**: Local database storage
- **Node.js**: Runtime environment
- **VS Code Extension API**: Extension integration

## Build System

- **Vite**: Web application bundling and development server
- **Webpack**: Extension bundling with ts-loader
- **Vitest**: Testing framework
- **ESLint**: Code linting with TypeScript rules

## Key Dependencies

- **@modelcontextprotocol/sdk**: MCP server implementation
- **marked**: Markdown parsing and rendering
- **highlight.js**: Syntax highlighting
- **express**: MCP server HTTP layer
- **minimatch**: File pattern matching for imports

## Development Commands

```bash
# Development
npm run dev              # Run both web and extension in watch mode
npm run dev:web          # Web app only (http://localhost:3000)
npm run dev:extension    # Extension only in watch mode

# Building
npm run build            # Build both web and extension
npm run build:web        # Build web app to dist/web
npm run build:extension  # Build extension to dist/extension.js

# Testing
npm test                 # Run all tests once
npm run test:watch       # Run tests in watch mode
npm run test:extension   # Run VS Code extension tests

# Code Quality
npm run lint             # Check linting errors
npm run lint:fix         # Auto-fix linting errors

# Packaging
npm run package          # Create .vsix extension package
```

## TypeScript Configuration

- **Target**: ES2020 with DOM libraries
- **Module**: ESNext with node resolution
- **Path Aliases**: `@/*` for src, `@/shared/*`, `@/web/*`, `@/extension/*`
- **Strict Mode**: Enabled with consistent casing enforcement