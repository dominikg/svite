module.exports = {
  testPathIgnorePatterns: [
    '<rootDir>/test/app',
    '<rootDir>/test/cache',
    '<rootDir>/test/temp',
    '<rootDir>/examples',
    '<rootDir>/node_modules',
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/test/app',
    '<rootDir>/test/cache',
    '<rootDir>/test/temp',
    '<rootDir>/examples',
    '<rootDir>/node_modules',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/test/app',
    '<rootDir>/test/cache',
    '<rootDir>/test/temp',
    '<rootDir>/examples',
    '<rootDir>/node_modules',
  ],
  reporters: ['default', ['jest-junit', { outputDirectory: './test/temp' }]],
};
