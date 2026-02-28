import { ethers } from 'ethers';
import { RollupContract, StateRootManager } from './rollup-contract';
import { generateProofForBatch, ProofResult } from '../prover/src/prover';

interface Transaction {
  from: string;
  to: string;
  value: string;
  data: string;
  nonce: number;
  gasLimit: number;
  gasPrice: number;
}

interface BatchConfig {
  maxTransactions: number;
  maxGasLimit: number;
  aggregationSize: number;
}

export class BatchPoster {
  private rollupContract: RollupContract;
  private stateRootManager: StateRootManager;
  private config: BatchConfig;
  private pendingTransactions: Transaction[];
  private batchIndex: number;

  constructor(
    rollupContract: RollupContract,
    config: BatchConfig = {
      maxTransactions: 100,
      maxGasLimit: 10000000,
      aggregationSize: 5,
    }
  ) {
    this.rollupContract = rollupContract;
    this.stateRootManager = new StateRootManager(rollupContract);
    this.config = config;
    this.pendingTransactions = [];
    this.batchIndex = 0;
  }

  async initialize() {
    await this.stateRootManager.initialize();
    const currentBatch = await this.rollupContract.getCurrentBatchIndex();
    this.batchIndex = Number(currentBatch);
  }

  addTransaction(tx: Transaction) {
    this.pendingTransactions.push(tx);
  }

  addTransactions(txs: Transaction[]) {
    this.pendingTransactions.push(...txs);
  }

  async createBatch(): Promise<ProofResult> {
    if (this.pendingTransactions.length === 0) {
      throw new Error('No pending transactions to batch');
    }

    const batchTransactions = this.pendingTransactions.slice(0, this.config.maxTransactions);
    this.pendingTransactions = this.pendingTransactions.slice(this.config.maxTransactions);

    console.log(`Creating batch ${this.batchIndex} with ${batchTransactions.length} transactions`);

    const proof = await generateProofForBatch(batchTransactions, this.batchIndex);
    
    this.batchIndex++;
    
    return proof;
  }

  async postBatchToL1(proofResult: ProofResult, vKeyHash: string[]): Promise<boolean> {
    try {
      console.log(`Posting batch ${proofResult.batchIndex} to L1...`);
      
      await this.stateRootManager.submitStateUpdate(proofResult, vKeyHash);
      
      console.log(`Batch ${proofResult.batchIndex} successfully posted to L1`);
      return true;
    } catch (error) {
      console.error('Error posting batch to L1:', error);
      throw error;
    }
  }

  async postAggregatedBatchesToL1(
    proofResults: ProofResult[],
    vKeyHash: string[]
  ): Promise<boolean> {
    try {
      console.log(`Posting ${proofResults.length} aggregated batches to L1...`);
      
      await this.stateRootManager.submitAggregatedStateUpdates(proofResults, vKeyHash);
      
      console.log('Aggregated batches successfully posted to L1');
      return true;
    } catch (error) {
      console.error('Error posting aggregated batches to L1:', error);
      throw error;
    }
  }

  async processPendingTransactions(vKeyHash: string[]): Promise<ProofResult[]> {
    const proofs: ProofResult[] = [];
    
    while (this.pendingTransactions.length > 0) {
      const proof = await this.createBatch();
      proofs.push(proof);
      
      if (proofs.length >= this.config.aggregationSize) {
        await this.postAggregatedBatchesToL1(proofs, vKeyHash);
        proofs.length = 0;
      }
    }
    
    if (proofs.length > 0) {
      await this.postAggregatedBatchesToL1(proofs, vKeyHash);
    }
    
    return proofs;
  }

  async createAndPostBatch(vKeyHash: string[]): Promise<ProofResult> {
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

  updateConfig(newConfig: Partial<BatchConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

export class L1Bridge {
  private rollupContract: RollupContract;

  constructor(rollupContract: RollupContract) {
    this.rollupContract = rollupContract;
  }

  async bridgeAssetToL2(
    from: string,
    to: string,
    amount: bigint
  ): Promise<ethers.ContractTransactionReceipt> {
    console.log(`Bridging ${amount} from ${from} to L2 address ${to}`);
    
    const tx = await this.rollupContract['bridgeAssetToL2(address,address,uint256)'](
      from,
      to,
      amount
    );
    
    const receipt = await tx.wait();
    console.log('Asset bridged successfully');
    return receipt;
  }

  async bridgeAssetToL1(
    from: string,
    to: string,
    amount: bigint
  ): Promise<ethers.ContractTransactionReceipt> {
    console.log(`Bridging ${amount} from L2 address ${from} to ${to}`);
    
    const tx = await this.rollupContract['bridgeAssetToL1(address,address,uint256)'](
      from,
      to,
      amount
    );
    
    const receipt = await tx.wait();
    console.log('Asset bridged successfully');
    return receipt;
  }

  async getBridgeBalance(address: string): Promise<bigint> {
    return await this.rollupContract['bridgeBalances(address)'](address);
  }
}

export class RollupSequencer {
  private batchPoster: BatchPoster;
  private l1Bridge: L1Bridge;
  private isRunning: boolean;
  private intervalId: NodeJS.Timeout | null;

  constructor(batchPoster: BatchPoster, l1Bridge: L1Bridge) {
    this.batchPoster = batchPoster;
    this.l1Bridge = l1Bridge;
    this.isRunning = false;
    this.intervalId = null;
  }

  async start(batchInterval: number = 30000, vKeyHash: string[]) {
    if (this.isRunning) {
      console.log('Sequencer is already running');
      return;
    }

    console.log('Starting rollup sequencer...');
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      if (this.batchPoster.getPendingTransactionCount() >= this.batchPoster.getConfig().maxTransactions) {
        try {
          await this.batchPoster.processPendingTransactions(vKeyHash);
        } catch (error) {
          console.error('Error processing batch:', error);
        }
      }
    }, batchInterval);

    console.log('Sequencer started');
  }

  async stop() {
    if (!this.isRunning) {
      console.log('Sequencer is not running');
      return;
    }

    console.log('Stopping rollup sequencer...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Sequencer stopped');
  }

  async forceBatch(vKeyHash: string[]): Promise<ProofResult> {
    if (this.batchPoster.getPendingTransactionCount() === 0) {
      throw new Error('No pending transactions to batch');
    }

    return await this.batchPoster.createAndPostBatch(vKeyHash);
  }

  isSequencerRunning(): boolean {
    return this.isRunning;
  }
}
