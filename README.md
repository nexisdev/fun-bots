# EVM Transaction Simulator

A high-performance EVM testnet transaction simulator designed to generate wallets and conduct large-scale transactions.

## Features

- Generates 100,000 EVM wallets every 10 minutes
- Conducts 10 million transactions per day
- Efficient transaction queuing and batching
- Automatic nonce management
- Robust error handling and logging
- Continuous operation support

## Requirements

- Node.js v16 or higher
- npm v7 or higher
- Access to an EVM-compatible testnet RPC endpoint

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd evm-transaction-simulator
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory with the following variables:
```env
RPC_URL=your_testnet_rpc_url
```

## Usage

1. Build the project:
```bash
npm run build
```

2. Start the simulator:
```bash
npm start
```

For development with hot-reloading:
```bash
npm run dev
```

## Architecture

The simulator consists of three main components:

1. **WalletGenerator**: Handles the creation and management of EVM wallets
2. **TransactionManager**: Manages transaction queuing, batching, and execution
3. **Main Orchestrator**: Coordinates wallet generation and transaction processing

## Monitoring

The simulator includes comprehensive logging with Winston:
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output for real-time monitoring

## Performance Considerations

- Uses concurrent processing with configurable batch sizes
- Implements efficient nonce tracking
- Handles transaction failures with automatic retries
- Manages memory usage through periodic wallet rotation

## License

ISC 