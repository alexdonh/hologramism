const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

// The @hologramism/react-native package lives outside this app (monorepo sibling
// at ../../bindings/react-native), symlinked into node_modules. Metro must be
// told to watch the repo root so it can transform that package's TS source.
const repoRoot = path.resolve(__dirname, '../..');

const config = {
  watchFolders: [repoRoot],
  resolver: {
    // Always resolve react / react-native to this app's single copy.
    nodeModulesPaths: [path.resolve(__dirname, 'node_modules')],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
