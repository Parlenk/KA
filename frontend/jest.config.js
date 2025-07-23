const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  // Test environment
  testEnvironment: 'jsdom',
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/test/setup.ts'
  ],
  
  // Module name mapping for TypeScript paths
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: '<rootDir>/'
    }),
    // Handle CSS imports
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/test/__mocks__/fileMock.js',
    // Handle font imports
    '\\.(woff|woff2|eot|ttf|otf)$': '<rootDir>/src/test/__mocks__/fileMock.js'
  },
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  
  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      }
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  
  // Coverage settings
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
    '!src/stories/**/*',
    '!src/index.tsx',
    '!src/reportWebVitals.ts'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Test timeout
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json'
  ],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/build/',
    '<rootDir>/dist/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Global variables
  globals: {
    'ts-jest': {
      isolatedModules: true
    },
    // Canvas mock for Fabric.js tests
    HTMLCanvasElement: {
      prototype: {
        getContext: jest.fn(),
        toDataURL: jest.fn()
      }
    }
  },
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Maximum worker threads
  maxWorkers: '50%',
  
  // Verbose output
  verbose: true,
  
  // Error on deprecated features
  errorOnDeprecated: true,
  
  // Fail fast on first test failure
  bail: false,
  
  // Force exit after tests complete
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Detect leaked timers
  detectLeaks: false,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit.xml'
    }],
    ['jest-html-reporters', {
      publicPath: './test-results',
      filename: 'report.html',
      expand: true
    }]
  ]
};