module.exports = {
    preset: 'ts-jest',
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '<rootDir>/lib/',
    ],
    setupFilesAfterEnv: [
        '<rootDir>/jest-setup.ts',
    ],
    collectCoverageFrom: [
        'src/**/*.ts',
    ],
    coveragePathIgnorePatterns: [
        '\\.mock\\.ts$',
        '\\.d\\.ts$',
    ],
    coverageThreshold: {
        global: {
            statements: 97,
            branches: 90,
            functions: 100,
            lines: 97,
        },
    },
};
