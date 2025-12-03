// Jest setup file
process.env.NODE_ENV = 'test';
process.env.BNB_TESTNET_RPC = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
process.env.BNB_CHAIN_ID = '97';
process.env.BNB_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
process.env.BNB_PRIVATE_KEY = '0x0123456789012345678901234567890123456789012345678901234567890123';
process.env.CHAINGPT_API_URL = 'https://api.chaingpt.org';
process.env.CHAINGPT_API_KEY = 'test-api-key';
process.env.UNIBASE_API_URL = 'https://api.unibase.io';
process.env.UNIBASE_API_KEY = 'test-unibase-key';
process.env.UNIBASE_PROJECT_ID = 'test-project';

// Suppress console logs during tests
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};
