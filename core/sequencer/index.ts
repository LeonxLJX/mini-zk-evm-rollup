import { BatchProcessor } from '../batch-processor';
import { BridgeManager } from '../bridge';
import { ProofGenerator } from '../proof-generator';
import { SequencerStatus, ProofResult as ProofResultType } from '../types';

export class RollupSequencer {
  private batchProcessor: BatchProcessor;
  private bridgeManager: BridgeManager;
  private proofGenerator: ProofGenerator;
  private isRunning: boolean;
  private intervalId: NodeJS.Timeout | null;
  private lastBatchTimestamp: number;
  private totalBatches: number;

  constructor(
    batchProcessor: BatchProcessor,
    bridgeManager: BridgeManager,
    proofGenerator: ProofGenerator
  ) {
    this.batchProcessor = batchProcessor;
    this.bridgeManager = bridgeManager;
    this.proofGenerator = proofGenerator;
    this.isRunning = false;
    this.intervalId = null;
    this.lastBatchTimestamp = 0;
    this.totalBatches = 0;
  }

  async start(batchInterval: number = 30000, vKeyHash: string[]): Promise<void> {
    if (this.isRunning) {
      console.log('Sequencer is already running');
      return;
    }

    console.log('Starting rollup sequencer...');
    this.isRunning = true;

    this.intervalId = setInterval(async () => {
      await this.processBatch(vKeyHash);
    }, batchInterval);

    console.log('Sequencer started');
  }

  async stop(): Promise<void> {
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

  async processBatch(vKeyHash: string[]): Promise<ProofResultType[]> {
    if (this.batchProcessor.getPendingTransactionCount() === 0) {
      return [];
    }

    if (this.batchProcessor.isProcessing()) {
      console.log('Batch processing already in progress');
      return [];
    }

    try {
      const proofs = await this.batchProcessor.processPendingTransactions(vKeyHash);
      if (proofs.length > 0) {
        this.lastBatchTimestamp = Math.floor(Date.now() / 1000);
        this.totalBatches += proofs.length;
      }
      return proofs;
    } catch (error) {
      console.error('Error processing batch:', error);
      return [];
    }
  }

  async forceBatch(vKeyHash: string[]): Promise<ProofResultType> {
    if (this.batchProcessor.getPendingTransactionCount() === 0) {
      throw new Error('No pending transactions to batch');
    }

    const proof = await this.batchProcessor.createAndPostBatch(vKeyHash);
    this.lastBatchTimestamp = Math.floor(Date.now() / 1000);
    this.totalBatches++;
    return proof;
  }

  isSequencerRunning(): boolean {
    return this.isRunning;
  }

  getStatus(): SequencerStatus {
    return {
      isRunning: this.isRunning,
      pendingTransactions: this.batchProcessor.getPendingTransactionCount(),
      lastBatchTimestamp: this.lastBatchTimestamp,
      totalBatches: this.totalBatches,
    };
  }

  async getPendingTransactionCount(): Promise<number> {
    return this.batchProcessor.getPendingTransactionCount();
  }

  async getTotalBatches(): Promise<number> {
    return this.totalBatches;
  }

  async getLastBatchTimestamp(): Promise<number> {
    return this.lastBatchTimestamp;
  }
}

export function createRollupSequencer(
  batchProcessor: BatchProcessor,
  bridgeManager: BridgeManager,
  proofGenerator: ProofGenerator
): RollupSequencer {
  return new RollupSequencer(batchProcessor, bridgeManager, proofGenerator);
}
