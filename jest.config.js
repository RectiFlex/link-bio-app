// jest.config.js
export default {
    testEnvironment: 'node',
    transform: {
      '^.+\\.js$': 'babel-jest',
    },
    setupFilesAfterEnv: ['./tests/setup.js'],
  };