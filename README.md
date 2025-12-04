# AgentOS Web3 Project

A Node.js backend service integrating ChainGPT, Unibase, X402, and blockchain services.

## Quick Links

- 📚 **[Features Documentation](FEATURES.md)** - Comprehensive guide to all features and capabilities
- 🧪 **[Test Coverage Report](FEATURES.md#coverage-metrics)** - Current testing status and metrics

## Project Structure

```
AgentOS-web3/
├── src/
│   ├── services/
│   │   ├── chainGPT/
│   │   ├── unibase/
│   │   ├── x402/
│   │   └── blockchain/
│   ├── routes/
│   ├── controllers/
│   ├── models/
│   ├── utils/
│   └── tests/
├── config/
├── .env
├── .gitignore
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables in `.env`

3. Run development server:
```bash
npm run dev
```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report

## Environment Variables

See `.env` file for required configuration.

## Documentation

For detailed information about features, API endpoints, and usage examples, see [FEATURES.md](FEATURES.md).
