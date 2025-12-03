# AgentOS Web3 Project

A Node.js backend service integrating ChainGPT, Unibase, X402, and blockchain services.

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

## Environment Variables

See `.env` file for required configuration.
