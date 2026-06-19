module.exports = {
  testEnvironment: 'node',
  setupFilesAfterSetup: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/migrations/**', '!src/seeds/**'],
  coverageDirectory: 'coverage',
  verbose: true,
};
