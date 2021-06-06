module.exports = {
  all: true,
  include: [
    'src',
  ],
  reportDir: './artifacts/coverage',
  tempDir: './artifacts/nyc_temp',
  reporter: [
    'text',
    'html',
  ],

  checkCoverage: true,
  perFile: true,
  branches: 95,
  lines: 95,
  functions: 95,
  statements: 95,
}
