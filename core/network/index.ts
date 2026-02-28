import { ethers } from 'ethers';
import { getLogger } from '../utils/logger';
import { Batch, Transaction } from '../types';

interface NetworkConfig {
  l1RpcUrl: string;
  l2RpcUrl: string;
  maxRetries: number;
  retryInterval: number;
}

export class NetworkManager {
  private provider: ethers.JsonRpcProvider;
  private l2Provider: ethers.JsonRpcProvider;
  private config: NetworkConfig;
  private logger = getLogger();

  constructor(config: NetworkConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    this.l2Provider = new ethers.JsonRpcProvider(config.l2RpcUrl);
  }

  async getLatestBlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.provider.getBlockNumber();
      this.logger.debug(`Latest L1 block number: ${blockNumber}`);
      return blockNumber;
    } catch (error) {
      this.logger.error('Error getting latest block number:', error as Error);
      throw error;
    }
  }

  async getBlock(blockNumber: number): Promise<ethers.Block> {
    try {
      const block = await this.provider.getBlock(blockNumber);
      this.logger.debug(`Retrieved block ${blockNumber}`);
      return block;
    } catch (error) {
      this.logger.error(`Error getting block ${blockNumber}:`, error as Error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      this.logger.debug(`Retrieved transaction receipt for ${txHash}`);
      return receipt;
    } catch (error) {
      this.logger.error(`Error getting transaction receipt for ${txHash}:`, error as Error);
      throw error;
    }
  }

  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    try {
      const response = await this.provider.send('eth_sendTransaction', [tx]);
      this.logger.debug(`Sent transaction: ${response}`);
      return response;
    } catch (error) {
      this.logger.error('Error sending transaction:', error as Error);
      throw error;
    }
  }

  async estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    try {
      const gas = await this.provider.estimateGas(tx);
      this.logger.debug(`Estimated gas: ${gas}`);
      return gas;
    } catch (error) {
      this.logger.error('Error estimating gas:', error as Error);
      throw error;
    }
  }

  async getGasPrice(): Promise<bigint> {
    try {
      const gasPrice = await this.provider.getGasPrice();
      this.logger.debug(`Current gas price: ${gasPrice}`);
      return gasPrice;
    } catch (error) {
      this.logger.error('Error getting gas price:', error as Error);
      throw error;
    }
  }

  async getL2BlockNumber(): Promise<number> {
    try {
      const blockNumber = await this.l2Provider.getBlockNumber();
      this.logger.debug(`Latest L2 block number: ${blockNumber}`);
      return blockNumber;
    } catch (error) {
      this.logger.error('Error getting latest L2 block number:', error as Error);
      throw error;
    }
  }

  async syncBatches(startBatchIndex: number, endBatchIndex: number): Promise<Batch[]> {
    // Simulated batch syncing
    const batches: Batch[] = [];
    for (let i = startBatchIndex; i <= endBatchIndex; i++) {
      batches.push({
        batchIndex: i,
        oldStateRoot: `0x${'0'.repeat(64)}`,
        newStateRoot: `0x${'1'.repeat(64)}`,
        transactions: [],
        transactionCount: 0,
        timestamp: Date.now(),
        proofData: '0x',
        vKeyHash: ['0x'],
        finalized: true
      });
    }
    this.logger.info(`Synced ${batches.length} batches`);
    return batches;
  }

  async broadcastTransaction(tx: Transaction): Promise<string> {
    // Simulated transaction broadcasting
    const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    this.logger.info(`Broadcasted transaction: ${txHash}`);
    return txHash;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.getLatestBlockNumber();
      await this.getL2BlockNumber();
      this.logger.debug('Network health check passed');
      return true;
    } catch (error) {
      this.logger.error('Network health check failed:', error as Error);
      return false;
    }
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getL2Provider(): ethers.JsonRpcProvider {
    return this.l2Provider;
  }

  getConfig(): NetworkConfig {
    return { ...this.config };
  }

  updateConfig(newConfig: Partial<NetworkConfig>): void {
    this.config = { ...this.config, ...newConfig };
    // Reinitialize providers if RPC URLs changed
    if (newConfig.l1RpcUrl) {
      this.provider = new ethers.JsonRpcProvider(newConfig.l1RpcUrl);
    }
    if (newConfig.l2RpcUrl) {
      this.l2Provider = new ethers.JsonRpcProvider(newConfig.l2RpcUrl);
    }
  }
}

export function createNetworkManager(config: NetworkConfig): NetworkManager {
  return new NetworkManager(config);
}
