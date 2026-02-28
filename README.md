# Mini ZK-EVM Rollup

A lightweight implementation of a ZK-EVM rollup inspired by zksync-era, designed for educational and development purposes.

## Features

- **Modular Architecture**: Follows zksync-era's design pattern with clear separation of concerns
- **Batch Processing**: Optimized transaction batching with compression, aggregation, and parallel processing
- **State Management**: Robust state root calculations using Merkle trees and state persistence
- **Security**: Advanced access control with role-based permissions, audit logging, and account lockout
- **Gas Optimization**: Advanced gas price estimation, gas limit calculation, and transaction sorting
- **Error Handling**: Comprehensive structured logging with different log levels
- **Bridge Functionality**: Asset bridging between L1 and L2 with asset management
- **Network Management**: L1 and L2 network communication and health checks
- **Transaction Execution**: Transaction validation and state transition management
- **Developer Experience**: Flexible configuration, comprehensive documentation, and modular design

## Project Structure

```
mini-zk-evm-rollup/
├── core/                  # Core rollup functionality
│   ├── batch-processor/   # Transaction batching and processing
│   ├── bridge/            # L1-L2 asset bridging
│   ├── config/            # Configuration management
│   ├── executor/          # Transaction execution and state transitions
│   ├── network/           # Network communication and health checks
│   ├── proof-generator/   # Proof generation utilities
│   ├── security/          # Access control and security management
│   ├── sequencer/         # Transaction sequencing
│   ├── state-manager/     # State root management
│   ├── types/             # Type definitions
│   └── utils/             # Utility functions
├── lib/                   # External libraries and contracts
├── prover/                # Prover implementation
├── scripts/               # Deployment and management scripts
├── tests/                 # Test suite
├── package.json           # Project configuration
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Getting Started

### Prerequisites

- Node.js v16.0.0 or higher
- npm v7.0.0 or higher
- Rust (for prover compilation)
- An Ethereum node (local or remote)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/your-username/mini-zk-evm-rollup.git
   cd mini-zk-evm-rollup
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Build the project
   ```bash
   npm run build
   ```

### Configuration

The rollup can be configured using a JSON config file or programmatically. Here's an example configuration:

```json
{
  "l1RpcUrl": "http://localhost:8545",
  "l2RpcUrl": "http://localhost:8546",
  "rollupContractAddress": "0x...",
  "privateKey": "0x...",
  "vKeyHash": ["0x..."],
  "batchInterval": 30000,
  "maxTransactionsPerBatch": 100,
  "logging": {
    "level": "info",
    "enableFileLogging": false,
    "logFilePath": "./logs/rollup.log"
  },
  "security": {
    "enableAccessControl": true,
    "authorizedAddresses": ["0x..."]
  },
  "gas": {
    "maxGasPrice": 100,
    "gasMultiplier": 1.1
  },
  "bridge": {
    "enabled": true,
    "refreshInterval": 10000
  },
  "prover": {
    "path": "./prover",
    "enableCaching": true,
    "cacheSize": 100
  }
}
```

### Usage

#### Starting the Rollup

```typescript
import { ZKRollup, createZKRollup } from './core';

// Create configuration
const config = {
  l1RpcUrl: 'http://localhost:8545',
  l2RpcUrl: 'http://localhost:8546',
  rollupContractAddress: '0x...',
  privateKey: '0x...',
  vKeyHash: ['0x...'],
  batchConfig: {
    maxTransactions: 100,
    maxGasLimit: 10000000,
    aggregationSize: 5,
    batchInterval: 30000,
  },
  security: {
    accessControl: true,
    inputValidation: true,
    gasLimitValidation: true,
  },
};

// Create and initialize rollup
const rollup = createZKRollup(config);
await rollup.initialize();

// Start sequencer
await rollup.startSequencer();
```

#### Submitting Transactions

```typescript
const transaction = {
  from: '0x...',
  to: '0x...',
  value: '1000000000000000000', // 1 ETH
  data: '0x',
  nonce: 0,
  gasLimit: 21000,
  gasPrice: 10000000000,
};

const txId = await rollup.submitTransaction(transaction);
console.log('Transaction submitted:', txId);

// Submit multiple transactions
const transactions = [
  {
    from: '0x...',
    to: '0x...',
    value: '500000000000000000', // 0.5 ETH
    data: '0x',
    nonce: 1,
    gasLimit: 21000,
    gasPrice: 10000000000,
  },
  {
    from: '0x...',
    to: '0x...',
    value: '250000000000000000', // 0.25 ETH
    data: '0x',
    nonce: 2,
    gasLimit: 21000,
    gasPrice: 10000000000,
  },
];

const txIds = await rollup.submitTransactions(transactions);
console.log('Transactions submitted:', txIds);
```

#### Bridging Assets

```typescript
// Bridge ETH from L1 to L2
await rollup.bridgeToL2(
  '0x...', // L2 address
  1000000000000000000n, // 1 ETH
  undefined // No token address for ETH
);

// Bridge ERC20 from L1 to L2
await rollup.bridgeToL2(
  '0x...', // L2 address
  1000000000000000000n, // 1 token
  '0x...' // ERC20 token address
);

// Bridge assets from L2 to L1
await rollup.bridgeToL1(
  '0x...', // L1 address
  500000000000000000n, // 0.5 ETH
  undefined // No token address for ETH
);
```

#### Managing Security Roles

```typescript
// Add a sequencer role to an address
await rollup.addRole('0x...', 'SEQUENCER');

// Add a prover role to an address
await rollup.addRole('0x...', 'PROVER');

// Check audit logs
const logs = await rollup.getAuditLogs(50);
console.log('Audit logs:', logs);
```

## API Reference

### ZKRollup Class

- **constructor(config: ZKRollupConfig)**: Creates a new rollup instance
- **initialize(): Promise<void>**: Initializes the rollup components
- **submitTransaction(tx: Transaction): Promise<string>**: Adds a transaction to the pending pool
- **submitTransactions(txs: Transaction[]): Promise<string[]>**: Adds multiple transactions to the pending pool
- **processBatch(): Promise<ProofResult[]>**: Processes the current batch of transactions
- **startSequencer(interval?: number): Promise<void>**: Starts the rollup sequencer
- **stopSequencer(): Promise<void>**: Stops the rollup sequencer
- **bridgeToL2(to: string, amount: bigint, tokenAddress?: string): Promise<ethers.ContractTransactionReceipt>**: Bridges assets from L1 to L2
- **bridgeToL1(to: string, amount: bigint, tokenAddress?: string): Promise<ethers.ContractTransactionReceipt>**: Bridges assets from L2 to L1
- **getCurrentStateRoot(): Promise<string>**: Gets the current state root
- **getBatchCount(): Promise<number>**: Gets the total number of batches
- **getBatch(batchIndex: number): Promise<Batch | undefined>**: Gets a specific batch
- **getLatestBatches(count: number): Promise<Batch[]>**: Gets the latest batches
- **getSequencerStatus(): Promise<SequencerStatus>**: Gets the current sequencer status
- **getBridgeBalance(address: string, tokenAddress?: string): Promise<bigint>**: Gets the bridge balance for an address
- **approveBridge(spender: string, amount: bigint, tokenAddress?: string): Promise<ethers.ContractTransactionReceipt>**: Approves bridge spending
- **addRole(address: string, role: Role): Promise<void>**: Adds a role to an address
- **removeRole(address: string, role: Role): Promise<void>**: Removes a role from an address
- **getAuditLogs(limit?: number): Promise<AuditLog[]>**: Gets audit logs

### BatchProcessor Class

- **addTransaction(tx: Transaction): void**: Adds a transaction to the pending pool
- **addTransactions(txs: Transaction[]): void**: Adds multiple transactions to the pending pool
- **createBatch(): Promise<ProofResult>**: Creates a new batch from pending transactions
- **processPendingTransactions(vKeyHash: string[]): Promise<ProofResult[]>**: Processes all pending transactions
- **getPendingTransactionCount(): number**: Gets the number of pending transactions

### StateRootManager Class

- **getCurrentStateRoot(): Promise<string>**: Gets the current state root
- **getStateRoot(batchIndex: number): string | undefined**: Gets the state root for a specific batch
- **verifyStateTransition(oldRoot: string, newRoot: string, proofResult: ProofResult): Promise<boolean>**: Verifies a state transition
- **submitStateUpdate(proofResult: ProofResult, vKeyHash: string[]): Promise<boolean>**: Submits a state update to L1

### SecurityManager Class

- **checkAccess(address: string, requiredRole: Role): void**: Checks if an address has the required role
- **addRole(address: string, role: Role): void**: Adds a role to an address
- **removeRole(address: string, role: Role): void**: Removes a role from an address
- **getAuditLogs(limit?: number): AuditLog[]**: Gets audit logs

### NetworkManager Class

- **getLatestBlockNumber(): Promise<number>**: Gets the latest block number
- **healthCheck(): Promise<boolean>**: Performs a network health check
- **syncBatches(startBatchIndex: number, endBatchIndex: number): Promise<Batch[]>**: Syncs batches from L1

### ConfigManager Class

- **getInstance(config?: ZKRollupConfig): ConfigManager**: Gets the singleton instance
- **getConfig(): ZKRollupConfig**: Gets the current configuration
- **updateConfig(newConfig: Partial<ZKRollupConfig>): void**: Updates the configuration
- **loadConfigFromFile(filePath: string): void**: Loads configuration from a file
- **saveConfigToFile(filePath: string): void**: Saves configuration to a file

## Testing

Run the test suite:

```bash
npm test
```

## Deployment

Deploy the rollup contract to L1:

```bash
npm run deploy:contract
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
