import { ethers } from 'ethers';
import { Transaction, StateTransition } from '../types';
import { getLogger } from '../utils/logger';

interface ExecutorConfig {
  maxGasPerTransaction: number;
  maxGasPerBatch: number;
  gasPriceOracle: string;
  executionTimeout: number;
}

export class TransactionExecutor {
  private config: ExecutorConfig;
  private logger = getLogger();

  constructor(config: ExecutorConfig) {
    this.config = config;
  }

  async executeTransaction(tx: Transaction): Promise<StateTransition> {
    try {
      this.logger.debug(`Executing transaction from ${tx.from} to ${tx.to}`);
      
      // Validate transaction
      this.validateTransaction(tx);
      
      // Simulate transaction execution
      const gasUsed = this.calculateGasUsage(tx);
      const success = true; // Simulate successful execution
      const logs = [];
      
      // Generate state transition
      const stateTransition: StateTransition = {
        from: tx.from,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        nonce: tx.nonce,
        gasLimit: tx.gasLimit,
        gasPrice: tx.gasPrice,
        gasUsed,
        success,
        logs,
        returnData: '0x',
        blockNumber: 0,
        blockTimestamp: Date.now()
      };
      
      this.logger.debug(`Transaction executed successfully, gas used: ${gasUsed}`);
      return stateTransition;
    } catch (error) {
      this.logger.error('Error executing transaction:', error as Error);
      throw error;
    }
  }

  async executeBatch(transactions: Transaction[]): Promise<StateTransition[]> {
    const transitions: StateTransition[] = [];
    let totalGasUsed = 0;
    
    for (const tx of transactions) {
      try {
        const transition = await this.executeTransaction(tx);
        transitions.push(transition);
        totalGasUsed += transition.gasUsed;
        
        // Check if we've exceeded batch gas limit
        if (totalGasUsed > this.config.maxGasPerBatch) {
          this.logger.warn('Batch gas limit exceeded, stopping execution');
          break;
        }
      } catch (error) {
        this.logger.error(`Error executing transaction in batch:`, error as Error);
        // Continue with other transactions
      }
    }
    
    this.logger.info(`Executed ${transitions.length} out of ${transactions.length} transactions in batch`);
    return transitions;
  }

  private validateTransaction(tx: Transaction): void {
    if (!ethers.isAddress(tx.from)) {
      throw new Error('Invalid from address');
    }
    if (!ethers.isAddress(tx.to)) {
      throw new Error('Invalid to address');
    }
    if (tx.gasLimit > this.config.maxGasPerTransaction) {
      throw new Error('Gas limit exceeds maximum allowed per transaction');
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

  private calculateGasUsage(tx: Transaction): number {
    // Simple gas calculation based on transaction type
    if (tx.data && tx.data !== '0x') {
      // Contract interaction
      return 21000 + (tx.data.length - 2) / 2 * 16;
    } else {
      // Simple transfer
      return 21000;
    }
  }

  async estimateGas(tx: Transaction): Promise<number> {
    try {
      const estimatedGas = this.calculateGasUsage(tx);
      this.logger.debug(`Estimated gas for transaction: ${estimatedGas}`);
      return estimatedGas;
    } catch (error) {
      this.logger.error('Error estimating gas:', error as Error);
      throw error;
    }
  }

  async validateBatch(transactions: Transaction[]): Promise<{ valid: Transaction[]; invalid: { tx: Transaction; error: string }[] }> {
    const valid: Transaction[] = [];
    const invalid: { tx: Transaction; error: string }[] = [];
    
    for (const tx of transactions) {
      try {
        this.validateTransaction(tx);
        valid.push(tx);
      } catch (error) {
        invalid.push({ tx, error: (error as Error).message });
      }
    }
    
    this.logger.info(`Validated batch: ${valid.length} valid, ${invalid.length} invalid transactions`);
    return { valid, invalid };
  }

  getConfig(): ExecutorConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<ExecutorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

export function createTransactionExecutor(config: ExecutorConfig): TransactionExecutor {
  return new TransactionExecutor(config);
}
