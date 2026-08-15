module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': '@swc/jest',
    },
    testMatch: ['**/*.test.ts'],
};
