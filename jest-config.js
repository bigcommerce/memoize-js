module.exports = {
    preset: 'ts-jest',
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
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
