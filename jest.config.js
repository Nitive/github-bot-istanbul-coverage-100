module.exports = {
  verbose: true,
  testMatch: ['**/*test.js'],
  collectCoverageFrom: ['**/*.js'],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    'jest.config.js',
  ],
}
