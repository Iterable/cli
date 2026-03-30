export default {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/**/index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  testTimeout: 10000,
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        sourceMaps: true,
        module: { type: "es6" },
        jsc: {
          target: "es2022",
          parser: { syntax: "typescript", tsx: false },
          transform: {},
        },
      },
    ],
  },
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@t3-oss/env-core$": "<rootDir>/tests/__mocks__/@t3-oss/env-core.js",
    "^#ansi-styles$": "<rootDir>/node_modules/chalk/source/vendor/ansi-styles/index.js",
    "^#supports-color$": "<rootDir>/node_modules/chalk/source/vendor/supports-color/index.js",
  },
  transformIgnorePatterns: [
    "node_modules/(?!.*(@iterable|chalk|boxen|semver|camelcase|string-width|get-east-asian-width|emoji-regex|widest-line|ansi-align|wrap-ansi|strip-ansi|ansi-regex|ansi-styles|cli-boxes|type-fest))"
  ],
};
