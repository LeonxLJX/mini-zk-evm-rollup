import { ethers } from 'ethers';
import { RollupContract } from '../../lib/rollup-contract';
import { generateProofForBatch, ProofResult } from '../../prover/src/prover';
import { Transaction, BatchConfig, ProofResult as ProofResultType } from '../types';
import { StateRootManager } from '../state-manager';
import { getLogger, LogLevel } from '../utils/logger';

function compressTransactions(transactions: Transaction[]): Buffer {
  const compressed = transactions.map(tx => {
    return {
      f: tx.from,
      t: tx.to,
      v: tx.value,
      d: tx.data,
      n: tx.nonce,
      g: tx.gasLimit,
      p: tx.gasPrice
    };
  });
  return Buffer.from(JSON.stringify(compressed));
}

function decompressTransactions(data: Buffer): Transaction[] {
  const compressed = JSON.parse(data.toString());
  return compressed.map((tx: any) => {
    return {
      from: tx.f,
      to: tx.t,
      value: tx.v,
      data: tx.d,
      nonce: tx.n,
      gasLimit: tx.g,
      gasPrice: tx.p
    };
  });
}

function calculateGasUsage(transactions: Transaction[]): number {
  return transactions.reduce((total, tx) => total + tx.gasLimit, 0);
}

function optimizeBatch(transactions: Transaction[]): Transaction[] {
  return transactions.sort((a, b) => {
    const gasA = a.gasLimit * a.gasPrice;
    const gasB = b.gasLimit * b.gasPrice;
    return gasB - gasA;
  });
}

export class BatchProcessor {
  private rollupContract: RollupContract;
  private stateRootManager: StateRootManager;
  private config: BatchConfig;
  private pendingTransactions: Transaction[];
  private batchIndex: number;
  private processing: boolean;
  private transactionHashes: Set<string>;
  private batchStats: Map<number, { transactionCount: number; gasUsed: number; timestamp: number }>;
  private logger = getLogger();

  constructor(
    rollupContract: RollupContract,
    stateRootManager: StateRootManager,
    config: BatchConfig = {
      maxTransactions: 100,
      maxGasLimit: 10000000,
      aggregationSize: 5,
      batchInterval: 30000,
    }
  ) {
    this.rollupContract = rollupContract;
    this.stateRootManager = stateRootManager;
    this.config = config;
    this.pendingTransactions = [];
    this.batchIndex = 0;
    this.processing = false;
    this.transactionHashes = new Set();
    this.batchStats = new Map();
  }

  async initialize(): Promise<void> {
    await this.stateRootManager.initialize();
    const currentBatch = await this.rollupContract.getCurrentBatchIndex();
    this.batchIndex = Number(currentBatch);
  }

  private generateTransactionHash(tx: Transaction): string {
    const txData = {
      from: tx.from,
      to: tx.to,
      value: tx.value,
      data: tx.data,
      nonce: tx.nonce,
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice
    };
    return ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(txData)));
  }

  addTransaction(tx: Transaction): void {
    this.validateTransaction(tx);
    const txHash = this.generateTransactionHash(tx);
    
    if (this.transactionHashes.has(txHash)) {
      this.logger.debug('Duplicate transaction detected, skipping:', txHash);
      return;
    }
    
    this.pendingTransactions.push(tx);
    this.transactionHashes.add(txHash);
  }

  addTransactions(txs: Transaction[]): void {
    const validTxs = [];
    
    for (const tx of txs) {
      try {
        this.validateTransaction(tx);
        const txHash = this.generateTransactionHash(tx);
        
        if (!this.transactionHashes.has(txHash)) {
          validTxs.push(tx);
          this.transactionHashes.add(txHash);
        } else {
          this.logger.debug('Duplicate transaction detected, skipping:', txHash);
        }
      } catch (error) {
        this.logger.error('Invalid transaction:', (error as Error).message);
      }
    }
    
    this.pendingTransactions.push(...validTxs);
  }

  private validateTransaction(tx: Transaction): void {
    if (!ethers.isAddress(tx.from)) {
      throw new Error('Invalid from address');
    }
    if (!ethers.isAddress(tx.to)) {
      throw new Error('Invalid to address');
    }
    if (tx.gasLimit > this.config.maxGasLimit) {
      throw new Error('Gas limit exceeds maximum allowed');
    }
    if (tx.gasLimit < 21000) {
      throw new Error('Gas limit below minimum required');
    }
    if (tx.nonce < 0) {
      throw new Error('Nonce must be non-negative');
    }
    if (tx.gasPrice < 0) {
      throw new Error('Gas price must be non-negative');
    }
    if (tx.value && BigInt(tx.value) < 0n) {
      throw new Error('Value must be non-negative');
    }
    if (tx.data && !tx.data.startsWith('0x')) {
      throw new Error('Data must be a hex string');
    }
  }

  private calculateOptimalBatchSize(): number {
    // Calculate optimal batch size based on current network conditions and pending transactions
    const baseSize = Math.min(this.config.maxTransactions, this.pendingTransactions.length);
    
    // Adjust based on gas prices (simplified)
    const currentGasPrice = this.estimateCurrentGasPrice();
    const gasMultiplier = Math.max(0.5, Math.min(1.5, 1 / (currentGasPrice / 10)));
    
    const optimalSize = Math.floor(baseSize * gasMultiplier);
    return Math.max(1, Math.min(optimalSize, this.config.maxTransactions));
  }

  private estimateCurrentGasPrice(): number {
    // Simplified gas price estimation
    return 10; // Default to 10 gwei
  }

  async createBatch(): Promise<ProofResultType> {
    if (this.pendingTransactions.length === 0) {
      throw new Error('No pending transactions to batch');
    }

    const batchSize = this.calculateOptimalBatchSize();
    const batchTransactions = this.pendingTransactions.slice(0, batchSize);
    this.pendingTransactions = this.pendingTransactions.slice(batchSize);

    this.logger.info(`Creating batch ${this.batchIndex} with ${batchTransactions.length} transactions`);

    const optimizedTransactions = optimizeBatch(batchTransactions);
    const gasUsage = calculateGasUsage(optimizedTransactions);
    
    this.logger.debug(`Optimized batch gas usage: ${gasUsage}`);

    const proof = await generateProofForBatch(optimizedTransactions, this.batchIndex);
    
    // Store batch statistics
    this.batchStats.set(this.batchIndex, {
      transactionCount: batchTransactions.length,
      gasUsed: gasUsage,
      timestamp: Date.now()
    });
    
    this.batchIndex++;
    
    return proof;
  }

  async postBatchToL1(proofResult: ProofResultType, vKeyHash: string[]): Promise<boolean> {
    try {
      this.logger.info(`Posting batch ${proofResult.batchIndex} to L1...`);
      
      const gasPrice = await this.estimateOptimalGasPrice();
      const gasLimit = await this.getGasEstimate(proofResult, vKeyHash);
      
      this.logger.debug(`Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
      this.logger.debug(`Using gas limit: ${gasLimit}`);
      
      // Set gas options for the transaction
      const txOptions = {
        gasPrice,
        gasLimit
      };
      
      await this.stateRootManager.submitStateUpdate(proofResult, vKeyHash);
      
      this.logger.info(`Batch ${proofResult.batchIndex} successfully posted to L1`);
      return true;
    } catch (error) {
      this.logger.error('Error posting batch to L1:', error as Error);
      throw error;
    }
  }

  private async estimateOptimalGasPrice(): Promise<bigint> {
    try {
      // Get base gas price
      const baseGasPrice = await this.rollupContract.provider.getGasPrice();
      
      // Get gas price percentiles
      const feeHistory = await this.rollupContract.provider.getFeeData();
      
      // Calculate optimal gas price with buffer
      const bufferMultiplier = 1.1; // 10% buffer
      const optimalGasPrice = baseGasPrice.mul(BigInt(Math.floor(bufferMultiplier * 100))).div(BigInt(100));
      
      this.logger.debug(`Estimated optimal gas price: ${ethers.formatUnits(optimalGasPrice, 'gwei')} gwei`);
      return optimalGasPrice;
    } catch (error) {
      this.logger.error('Error estimating gas price:', error as Error);
      // Fallback to a reasonable default
      return ethers.parseUnits('10', 'gwei');
    }
  }

  private async getGasEstimate(proofResult: ProofResultType, vKeyHash: string[]): Promise<bigint> {
    try {
      const gasEstimate = await this.rollupContract.contract.estimateGas.submitBatch(
        proofResult.proofData,
        proofResult.publicValues,
        vKeyHash
      );
      
      // Add buffer to gas estimate
      const bufferMultiplier = 1.2; // 20% buffer
      const bufferedGasEstimate = gasEstimate.mul(BigInt(Math.floor(bufferMultiplier * 100))).div(BigInt(100));
      
      this.logger.debug(`Gas estimate: ${gasEstimate}, with buffer: ${bufferedGasEstimate}`);
      return bufferedGasEstimate;
    } catch (error) {
      this.logger.error('Error estimating gas:', error as Error);
      // Fallback to a reasonable default
      return BigInt(2000000);
    }
  }

  private calculateBatchGasUsage(transactions: Transaction[]): bigint {
    return transactions.reduce((total, tx) => {
      const txGas = BigInt(tx.gasLimit) * BigInt(tx.gasPrice);
      return total + txGas;
    }, BigInt(0));
  }

  private optimizeGasForBatch(transactions: Transaction[]): Transaction[] {
    // Sort transactions by gas price (highest first) to prioritize high-priority transactions
    return transactions.sort((a, b) => {
      const gasA = BigInt(a.gasPrice) * BigInt(a.gasLimit);
      const gasB = BigInt(b.gasPrice) * BigInt(b.gasLimit);
      return gasB > gasA ? 1 : gasB < gasA ? -1 : 0;
    });
  }

  async postAggregatedBatchesToL1(
    proofResults: ProofResultType[],
    vKeyHash: string[]
  ): Promise<boolean> {
    try {
      this.logger.info(`Posting ${proofResults.length} aggregated batches to L1...`);
      
      const gasPrice = await this.estimateOptimalGasPrice();
      // For aggregated batches, estimate gas based on the first proof and scale up
      const baseGasLimit = await this.getGasEstimate(proofResults[0], vKeyHash);
      const gasLimit = baseGasLimit.mul(BigInt(proofResults.length)).mul(BigInt(80)).div(BigInt(100)); // 80% of linear scaling
      
      this.logger.debug(`Using gas price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
      this.logger.debug(`Using gas limit: ${gasLimit}`);
      
      // Set gas options for the transaction
      const txOptions = {
        gasPrice,
        gasLimit
      };
      
      await this.stateRootManager.submitAggregatedStateUpdates(proofResults, vKeyHash);
      
      this.logger.info('Aggregated batches successfully posted to L1');
      return true;
    } catch (error) {
      this.logger.error('Error posting aggregated batches to L1:', error as Error);
      throw error;
    }
  }

  async processPendingTransactions(vKeyHash: string[]): Promise<ProofResultType[]> {
    if (this.processing) {
      this.logger.info('Batch processing already in progress');
      return [];
    }

    this.processing = true;
    const allProofs: ProofResultType[] = [];
    
    try {
      const maxConcurrentBatches = 3; // Limit concurrent batch processing
      
      while (this.pendingTransactions.length > 0) {
        const batchPromises: Promise<ProofResultType>[] = [];
        const batchCount = Math.min(maxConcurrentBatches, Math.ceil(this.pendingTransactions.length / this.config.maxTransactions));
        
        // Create multiple batches in parallel
        for (let i = 0; i < batchCount && this.pendingTransactions.length > 0; i++) {
          batchPromises.push(this.createBatch());
        }
        
        // Wait for all batch creations to complete
        const batchProofs = await Promise.all(batchPromises);
        allProofs.push(...batchProofs);
        
        // Post aggregated batches if we have enough
        if (allProofs.length >= this.config.aggregationSize) {
          const batchesToPost = allProofs.splice(0, this.config.aggregationSize);
          await this.postAggregatedBatchesToL1(batchesToPost, vKeyHash);
        }
      }
      
      if (allProofs.length > 0) {
        await this.postAggregatedBatchesToL1(allProofs, vKeyHash);
      }
    } catch (error) {
      this.logger.error('Error processing pending transactions:', error as Error);
      throw error;
    } finally {
      this.processing = false;
    }
    
    return allProofs;
  }

  async createAndPostBatch(vKeyHash: string[]): Promise<ProofResultType> {
    const proof = await this.createBatch();
    await this.postBatchToL1(proof, vKeyHash);
    return proof;
  }

  getPendingTransactionCount(): number {
    return this.pendingTransactions.length;
  }

  getBatchIndex(): number {
    return this.batchIndex;
  }

  getConfig(): BatchConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  isProcessing(): boolean {
    return this.processing;
  }

  clearPendingTransactions(): void {
    this.pendingTransactions = [];
    this.transactionHashes.clear();
  }

  getPendingTransactions(): Transaction[] {
    return [...this.pendingTransactions];
  }
}

export function createBatchProcessor(
  rollupContract: RollupContract,
  stateRootManager: StateRootManager,
  config?: BatchConfig
): BatchProcessor {
  return new BatchProcessor(rollupContract, stateRootManager, config);
}
