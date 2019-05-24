module.exports = {
  verbose: true,
  testMatch: ['**/*test.js'],
  collectCoverageFrom: ['**/*.js'],
  coverageReporters: ['json-summary', 'json', 'text', 'lcov'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    'jest.config.js',
  ],
}
