module.exports = {
    browser: true,
    preset: 'ts-jest',
    moduleFileExtensions: [
        'ts',
        'tsx',
        'js',
        'jsx',
        'json',
    ],
    setupTestFrameworkScriptFile: '<rootDir>/jest-setup.ts',
    collectCoverageFrom: [
        'src/**/*.ts',
    ],
    coveragePathIgnorePatterns: [
        '\\.mock\\.ts$',
        '\\.d\\.ts$',
    ],
};
