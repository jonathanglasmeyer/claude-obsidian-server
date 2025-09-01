const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the workspace
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve symlinks to their real path
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@obsidian-bridge/shared-components') {
    return {
      filePath: path.resolve(workspaceRoot, 'packages/shared-components/dist/index.js'),
      type: 'sourceFile',
    };
  }
  // Fallback to the default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;