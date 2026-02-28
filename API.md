# API Reference

## ZKRollup Class

Main class for interacting with the ZK EVM Rollup.

### Constructor

```typescript
constructor(config: ZKRollupConfig)
```

**Parameters:**
- `config.l1RpcUrl`: Ethereum L1 RPC URL
- `config.rollupContractAddress`: Address of the deployed rollup contract
- `config.privateKey`: Private key for signing transactions
- `config.vKeyHash`: Array of verification key hashes
- `config.batchInterval` (optional): Batch interval in milliseconds (default: 30000)
- `config.maxTransactionsPerBatch` (optional): Max transactions per batch (default: 100)

### Methods

#### `initialize()`

Initialize the rollup connection.

```typescript
await rollup.initialize()
```

**Returns:** `Promise<void>`

#### `submitTransaction(tx)`

Submit a transaction to the rollup.

```typescript
const txId = await rollup.submitTransaction({
  from: '0x...',
  to: '0x...',
  value: '1000000000000000000',
  data: '0x',
  nonce: 0,
  gasLimit: 21000,
  gasPrice: 1000000000,
});
```

**Parameters:**
- `tx.from`: Sender address
- `tx.to`: Recipient address
- `tx.value`: Transaction value in wei
- `tx.data`: Transaction data (hex string)
- `tx.nonce`: Transaction nonce
- `tx.gasLimit`: Gas limit
- `tx.gasPrice`: Gas price

**Returns:** `Promise<string>` - Transaction ID

#### `processBatch()`

Process pending transactions and generate a ZK proof.

```typescript
const proof = await rollup.processBatch();
```

**Returns:** `Promise<ProofResult>`

#### `startSequencer(interval?)`

Start the automatic batch sequencer.

```typescript
await rollup.startSequencer(30000);
```

**Parameters:**
- `interval` (optional): Batch interval in milliseconds

**Returns:** `Promise<void>`

#### `stopSequencer()`

Stop the batch sequencer.

```typescript
await rollup.stopSequencer();
```

**Returns:** `Promise<void>`

#### `bridgeToL2(to, amount)`

Bridge assets from L1 to L2.

```typescript
await rollup.bridgeToL2('0x...', BigInt('1000000000000000000'));
```

**Parameters:**
- `to`: Recipient address on L2
- `amount`: Amount to bridge in wei

**Returns:** `Promise<ContractTransactionReceipt>`

#### `bridgeToL1(to, amount)`

Bridge assets from L2 to L1.

```typescript
await rollup.bridgeToL1('0x...', BigInt('500000000000000000'));
```

**Parameters:**
- `to`: Recipient address on L1
- `amount`: Amount to bridge in wei

**Returns:** `Promise<ContractTransactionReceipt>`

#### `getCurrentStateRoot()`

Get the current state root.

```typescript
const stateRoot = await rollup.getCurrentStateRoot();
```

**Returns:** `Promise<string>` - Current state root (hex string)

#### `getBatchCount()`

Get the total number of batches.

```typescript
const count = await rollup.getBatchCount();
```

**Returns:** `Promise<bigint>` - Batch count

#### `getBatch(batchIndex)`

Get information about a specific batch.

```typescript
const batch = await rollup.getBatch(0);
```

**Parameters:**
- `batchIndex`: Index of the batch

**Returns:** `Promise<Batch>`

#### `getLatestBatches(count)`

Get the latest batches.

```typescript
const batches = await rollup.getLatestBatches(10);
```

**Parameters:**
- `count`: Number of batches to retrieve

**Returns:** `Promise<Batch[]>`

#### `pauseRollup()`

Pause the rollup (emergency stop).

```typescript
await rollup.pauseRollup();
```

**Returns:** `Promise<void>`

#### `unpauseRollup()`

Unpause the rollup.

```typescript
await rollup.unpauseRollup();
```

**Returns:** `Promise<void>`

#### `isPaused()`

Check if the rollup is paused.

```typescript
const paused = await rollup.isPaused();
```

**Returns:** `Promise<boolean>`

### Events

#### `onBatchSubmitted(callback)`

Listen for batch submission events.

```typescript
rollup.onBatchSubmitted((batchIndex, oldRoot, newRoot, txCount) => {
  console.log(`Batch ${batchIndex} submitted`);
});
```

#### `onStateRootUpdated(callback)`

Listen for state root update events.

```typescript
rollup.onStateRootUpdated((batchIndex, oldRoot, newRoot) => {
  console.log(`State root updated: ${newRoot}`);
});
```

#### `onProofVerified(callback)`

Listen for proof verification events.

```typescript
rollup.onProofVerified((batchIndex, proofHash) => {
  console.log(`Proof verified for batch ${batchIndex}`);
});
```

## Types

### ZKRollupConfig

```typescript
interface ZKRollupConfig {
  l1RpcUrl: string;
  l2RpcUrl?: string;
  rollupContractAddress: string;
  privateKey: string;
  vKeyHash: string[];
  batchInterval?: number;
  maxTransactionsPerBatch?: number;
}
```

### ProofResult

```typescript
interface ProofResult {
  proofId: string;
  batchIndex: number;
  proofData: string;
  publicValues: {
    oldStateRoot: string;
    newStateRoot: string;
    batchIndex: number;
    transactionCount: number;
    transactionHashes: string[];
  };
  proofSize: number;
  generationTime: number;
  timestamp: number;
}
```

### Batch

```typescript
interface Batch {
  batchIndex: number;
  stateRoot: string;
  transactionHashes: string[];
  timestamp: number;
  finalized: boolean;
}
```

### Transaction

```typescript
interface Transaction {
  from: string;
  to: string;
  value: string;
  data: string;
  nonce: number;
  gasLimit: number;
  gasPrice: number;
}
```

## React Hooks

### useZKRollup

Hook for managing ZK Rollup state and operations.

```typescript
const {
  rollup,
  status,
  isLoading,
  submitTransaction,
  processBatch,
  getLatestBatches,
  updateStatus,
} = useZKRollup(config);
```

**Returns:**
- `rollup`: ZKRollup instance
- `status`: Current rollup status
- `isLoading`: Loading state
- `submitTransaction`: Function to submit transactions
- `processBatch`: Function to process batches
- `getLatestBatches`: Function to get latest batches
- `updateStatus`: Function to update status

### useProofs

Hook for managing ZK proofs.

```typescript
const {
  proofs,
  selectedProof,
  setSelectedProof,
  addProof,
  updateProofStatus,
  removeProof,
  clearProofs,
} = useProofs();
```

**Returns:**
- `proofs`: Array of proofs
- `selectedProof`: Currently selected proof
- `setSelectedProof`: Function to select a proof
- `addProof`: Function to add a proof
- `updateProofStatus`: Function to update proof status
- `removeProof`: Function to remove a proof
- `clearProofs`: Function to clear all proofs

### useTransactions

Hook for managing transactions.

```typescript
const {
  transactions,
  pendingCount,
  addTransaction,
  updateTransactionStatus,
  removeTransaction,
  clearPendingTransactions,
  getPendingTransactions,
  getConfirmedTransactions,
} = useTransactions();
```

**Returns:**
- `transactions`: Array of transactions
- `pendingCount`: Number of pending transactions
- `addTransaction`: Function to add a transaction
- `updateTransactionStatus`: Function to update transaction status
- `removeTransaction`: Function to remove a transaction
- `clearPendingTransactions`: Function to clear pending transactions
- `getPendingTransactions`: Function to get pending transactions
- `getConfirmedTransactions`: Function to get confirmed transactions

## Utility Functions

### initializeRollup(config)

Initialize a ZK Rollup instance.

```typescript
const rollup = initializeRollup(config);
```

**Parameters:**
- `config`: ZKRollupConfig object

**Returns:** `ZKRollup` instance

### submitTransaction(rollup, tx)

Submit a transaction using a rollup instance.

```typescript
const txId = await submitTransaction(rollup, tx);
```

**Returns:** `Promise<string>` - Transaction ID

### processBatch(rollup)

Process a batch using a rollup instance.

```typescript
const proof = await processBatch(rollup);
```

**Returns:** `Promise<ProofResult>`

### generateZKProof(transactions, batchIndex)

Generate a ZK proof for a batch of transactions.

```typescript
const proof = await generateZKProof(transactions, 0);
```

**Returns:** `Promise<ProofResult>`

### verifyZKProofOnChain(rollup, proofData, publicValues)

Verify a ZK proof on-chain.

```typescript
const isValid = await verifyZKProofOnChain(rollup, proofData, publicValues);
```

**Returns:** `Promise<boolean>`

### getCurrentStateRoot(rollup)

Get the current state root.

```typescript
const stateRoot = await getCurrentStateRoot(rollup);
```

**Returns:** `Promise<string>`

### getBatchCount(rollup)

Get the batch count.

```typescript
const count = await getBatchCount(rollup);
```

**Returns:** `Promise<bigint>`

### getLatestBatches(rollup, count)

Get the latest batches.

```typescript
const batches = await getLatestBatches(rollup, 10);
```

**Returns:** `Promise<Batch[]>`

### bridgeToL2(rollup, to, amount)

Bridge assets to L2.

```typescript
await bridgeToL2(rollup, '0x...', BigInt('1000000000000000000'));
```

**Returns:** `Promise<ContractTransactionReceipt>`

### bridgeToL1(rollup, to, amount)

Bridge assets to L1.

```typescript
await bridgeToL1(rollup, '0x...', BigInt('500000000000000000'));
```

**Returns:** `Promise<ContractTransactionReceipt>`

## Error Handling

All async functions may throw errors. Handle them appropriately:

```typescript
try {
  const proof = await rollup.processBatch();
  console.log('Proof generated:', proof);
} catch (error) {
  console.error('Error processing batch:', error);
  // Handle error
}
```

Common errors:
- `Error('Rollup not initialized')`: Call `initialize()` first
- `Error('No pending transactions to process')`: Submit transactions first
- `Error('Invalid state transition')`: State root mismatch
- `Error('Invalid proof')`: Proof verification failed
