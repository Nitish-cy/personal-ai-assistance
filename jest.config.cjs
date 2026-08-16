module.exports = {
    testEnvironment: 'node',
    transform: {
        '^.+\\.ts$': [
            '@swc/jest',
            {
                jsc: {
                    parser: { syntax: 'typescript', decorators: true },
                    transform: { legacyDecorator: true },
                },
            },
        ],
    },
    testMatch: ['**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/web/', '\\.integration\\.test\\.ts$'],
};
