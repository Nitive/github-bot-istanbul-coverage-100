module.exports = {
  verbose: true,
  testMatch: ['**/*test.js'],
  collectCoverageFrom: ['**/*.js'],
  coverageReporters: ['json-summary', 'text'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    'jest.config.js',
  ],
}
