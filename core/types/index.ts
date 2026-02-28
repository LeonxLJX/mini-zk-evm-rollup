import { ethers } from 'ethers';

export interface Transaction {
  from: string;
  to: string;
  value: string;
  data: string;
  nonce: number;
  gasLimit: number;
  gasPrice: number;
}

export interface StateTransition {
  from: string;
  to: string;
  value: bigint;
  data: string;
  nonce: number;
  gasLimit: number;
  gasPrice: number;
  gasUsed: number;
  success: boolean;
  logs: any[];
  returnData: string;
  blockNumber: number;
  blockTimestamp: number;
}

export interface StateTransitionProof {
  oldStateRoot: string;
  newStateRoot: string;
  batchIndex: number;
  transactionCount: number;
  transactionHashes: string[];
}

export interface ProofResult {
  proofId: string;
  batchIndex: number;
  proofData: string;
  publicValues: StateTransitionProof;
  proofSize: number;
  generationTime: number;
  timestamp: number;
}

export interface BatchConfig {
  maxTransactions: number;
  maxGasLimit: number;
  aggregationSize: number;
  batchInterval: number;
}

export interface NetworkConfig {
  l1RpcUrl: string;
  l2RpcUrl: string;
  maxRetries: number;
  retryInterval: number;
}

export interface ExecutorConfig {
  maxGasPerTransaction: number;
  maxGasPerBatch: number;
  gasPriceOracle: string;
  executionTimeout: number;
}

export interface ZKRollupConfig {
  l1RpcUrl: string;
  l2RpcUrl: string;
  rollupContractAddress: string;
  privateKey: string;
  vKeyHash: string[];
  batchConfig?: BatchConfig;
  networkConfig?: NetworkConfig;
  executorConfig?: ExecutorConfig;
  logging?: {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
    format: 'json' | 'text';
  };
  security?: {
    accessControl: boolean;
    inputValidation: boolean;
    gasLimitValidation: boolean;
  };
  gas?: {
    maxGasPrice: number;
    gasPriceBuffer: number;
    gasLimitMultiplier: number;
  };
  bridge?: {
    maxBridgeAmount: bigint;
    bridgeFeePercentage: number;
  };
  prover?: {
    proofGenerationTimeout: number;
    proofVerificationTimeout: number;
  };
}

export interface Batch {
  batchIndex: number;
  oldStateRoot: string;
  newStateRoot: string;
  transactions: Transaction[];
  transactionCount: number;
  timestamp: number;
  proofData: string;
  vKeyHash: string[];
  finalized: boolean;
}

export interface BridgeTransfer {
  from: string;
  to: string;
  amount: bigint;
  tokenAddress?: string;
  direction: 'L1_to_L2' | 'L2_to_L1';
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  batchIndex?: number;
}

export interface SequencerStatus {
  isRunning: boolean;
  lastBatchTime: number;
  pendingTransactions: number;
  totalBatchesProcessed: number;
}

export type RollupEventCallback = (
  batchIndex: number,
  oldRoot: string,
  newRoot: string,
  txCount: number
) => void;

export type StateRootUpdateCallback = (
  batchIndex: number,
  oldRoot: string,
  newRoot: string
) => void;

export type ProofVerifiedCallback = (
  batchIndex: number,
  proofHash: string
) => void;
