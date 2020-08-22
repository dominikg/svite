module.exports = {
  testPathIgnorePatterns: ['/test/app/.*', '/test/temp/.*', '/examples/.*', '/node_modules/.*'],
  watchPathIgnorePatterns: ['<rootDir>/test/temp'],
  reporters: ['default', ['jest-junit', { outputDirectory: './test/temp' }]],
  testResultsProcessor: 'jest-junit',
};
