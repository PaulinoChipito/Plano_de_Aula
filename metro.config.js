const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const ignoredDirs = [
  /\/\.local\/.*/,
  /\/\.git\/.*/,
  /\/attached_assets\/.*/,
  /\/\.cache\/.*/,
];

config.resolver.blockList = config.resolver.blockList
  ? [].concat(config.resolver.blockList, ignoredDirs)
  : ignoredDirs;

module.exports = config;
