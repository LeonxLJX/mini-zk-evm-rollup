import { ethers } from 'ethers';
import { RollupContract } from '../../lib/rollup-contract';
import { ProofResult, Batch, Transaction, StateTransition } from '../types';
import { getLogger } from '../utils/logger';

class MerkleTree {
  private leaves: string[];
  private layers: string[][];

  constructor(leaves: string[]) {
    this.leaves = leaves;
    this.layers = [leaves];
    this.build();
  }

  private build(): void {
    let currentLayer = this.leaves;
    while (currentLayer.length > 1) {
      const nextLayer: string[] = [];
      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || left; // Handle odd number of leaves
        const combined = left + right;
        const hash = ethers.keccak256(ethers.toUtf8Bytes(combined));
        nextLayer.push(hash);
      }
      this.layers.push(nextLayer);
      currentLayer = nextLayer;
    }
  }

  getRoot(): string {
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): string[] {
    const proof: string[] = [];
    let currentIndex = index;
    
    for (const layer of this.layers.slice(0, -1)) {
      const isRightNode = currentIndex % 2 === 1;
      const siblingIndex = isRightNode ? currentIndex - 1 : currentIndex + 1;
      
      if (siblingIndex < layer.length) {
        proof.push(layer[siblingIndex]);
      }
      
      currentIndex = Math.floor(currentIndex / 2);
    }
    
    return proof;
  }

  static verifyProof(leaf: string, proof: string[], root: string): boolean {
    let currentHash = leaf;
    
    for (const sibling of proof) {
      const combined = currentHash + sibling;
      currentHash = ethers.keccak256(ethers.toUtf8Bytes(combined));
    }
    
    return currentHash === root;
  }
}

function calculateStateRoot(transactions: Transaction[], previousRoot: string): string {
  const txHashes = transactions.map(tx => {
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
  });

  const tree = new MerkleTree([previousRoot, ...txHashes]);
  return tree.getRoot();
}

function verifyStateRoot(transactions: Transaction[], previousRoot: string, expectedRoot: string): boolean {
  const calculatedRoot = calculateStateRoot(transactions, previousRoot);
  return calculatedRoot === expectedRoot;
}

export class StateRootManager {
  private rollupContract: RollupContract;
  private stateHistory: Map<number, string>;
  private batchHistory: Map<number, Batch>;
  private stateStorage: Map<string, string>; // Address to balance mapping
  private logger = getLogger();

  constructor(rollupContract: RollupContract) {
    this.rollupContract = rollupContract;
    this.stateHistory = new Map();
    this.batchHistory = new Map();
    this.stateStorage = new Map();
  }

  async initialize(): Promise<void> {
    const currentBatch = await this.rollupContract.getCurrentBatchIndex();
    
    for (let i = 0; i < Number(currentBatch); i++) {
      try {
        const batch = await this.rollupContract.getBatch(i);
        this.stateHistory.set(i, batch.stateRoot);
        this.batchHistory.set(i, {
          batchIndex: i,
          stateRoot: batch.stateRoot,
          transactionHashes: batch.transactionHashes,
          timestamp: batch.timestamp,
          finalized: batch.finalized,
        });
      } catch (error) {
        this.logger.error(`Error loading batch ${i}:`, error as Error);
      }
    }
    
    this.logger.info(`Initialized state root manager with ${this.stateHistory.size} batches`);
  }

  // State storage methods
  getBalance(address: string): string {
    return this.stateStorage.get(address.toLowerCase()) || '0';
  }

  setBalance(address: string, balance: string): void {
    this.stateStorage.set(address.toLowerCase(), balance);
  }

  updateState(transitions: StateTransition[]): void {
    for (const transition of transitions) {
      if (transition.success) {
        // Update balances
        const fromBalance = BigInt(this.getBalance(transition.from));
        const toBalance = BigInt(this.getBalance(transition.to));
        const value = BigInt(transition.value);
        
        if (fromBalance >= value) {
          this.setBalance(transition.from, (fromBalance - value).toString());
          this.setBalance(transition.to, (toBalance + value).toString());
        }
      }
    }
  }

  // State persistence
  async saveState(): Promise<void> {
    // In a real implementation, this would save to disk or database
    this.logger.info('State saved to memory');
  }

  async loadState(): Promise<void> {
    // In a real implementation, this would load from disk or database
    this.logger.info('State loaded from memory');
  }

  async getCurrentStateRoot(): Promise<string> {
    return await this.rollupContract.getCurrentStateRoot();
  }

  getStateRoot(batchIndex: number): string | undefined {
    return this.stateHistory.get(batchIndex);
  }

  getBatch(batchIndex: number): Batch | undefined {
    return this.batchHistory.get(batchIndex);
  }

  async verifyStateTransition(
    oldRoot: string,
    newRoot: string,
    proofResult: ProofResult
  ): Promise<boolean> {
    const expectedOldRoot = proofResult.publicValues.oldStateRoot;
    const expectedNewRoot = proofResult.publicValues.newStateRoot;

    if (oldRoot !== expectedOldRoot) {
      this.logger.error(`State root mismatch: expected ${expectedOldRoot}, got ${oldRoot}`);
      return false;
    }

    if (newRoot !== expectedNewRoot) {
      this.logger.error(`State root mismatch: expected ${expectedNewRoot}, got ${newRoot}`);
      return false;
    }

    this.logger.debug(`State transition verified: ${oldRoot} -> ${newRoot}`);
    return true;
  }

  calculateStateRoot(transactions: Transaction[], previousRoot: string): string {
    return calculateStateRoot(transactions, previousRoot);
  }

  verifyStateRoot(transactions: Transaction[], previousRoot: string, expectedRoot: string): boolean {
    return verifyStateRoot(transactions, previousRoot, expectedRoot);
  }

  async submitStateUpdate(proofResult: ProofResult, vKeyHash: string[]): Promise<boolean> {
    const currentRoot = await this.getCurrentStateRoot();
    
    const isValid = await this.verifyStateTransition(
      currentRoot,
      proofResult.publicValues.newStateRoot,
      proofResult
    );

    if (!isValid) {
      throw new Error('Invalid state transition');
    }

    try {
      this.logger.info(`Submitting state update for batch ${proofResult.batchIndex}`);
      
      await this.rollupContract.submitBatch(
        proofResult.proofData,
        proofResult.publicValues,
        vKeyHash
      );
      
      this.stateHistory.set(proofResult.batchIndex, proofResult.publicValues.newStateRoot);
      this.batchHistory.set(proofResult.batchIndex, {
        batchIndex: proofResult.batchIndex,
        stateRoot: proofResult.publicValues.newStateRoot,
        transactionHashes: proofResult.publicValues.transactionHashes,
        timestamp: Math.floor(Date.now() / 1000),
        finalized: true,
      });
      
      // Save state after successful submission
      await this.saveState();
      
      this.logger.info(`State update submitted successfully for batch ${proofResult.batchIndex}`);
      return true;
    } catch (error) {
      this.logger.error('Error submitting state update:', error as Error);
      throw error;
    }
  }

  async submitAggregatedStateUpdates(
    proofResults: ProofResult[],
    vKeyHash: string[]
  ): Promise<boolean> {
    const currentRoot = await this.getCurrentStateRoot();
    const transitions = proofResults.map(p => p.publicValues);
    
    try {
      this.logger.info(`Submitting ${proofResults.length} aggregated state updates`);
      
      await this.rollupContract.submitAggregatedBatch(
        proofResults[0].proofData,
        transitions,
        vKeyHash
      );
      
      proofResults.forEach((proof) => {
        this.stateHistory.set(proof.batchIndex, proof.publicValues.newStateRoot);
        this.batchHistory.set(proof.batchIndex, {
          batchIndex: proof.batchIndex,
          stateRoot: proof.publicValues.newStateRoot,
          transactionHashes: proof.publicValues.transactionHashes,
          timestamp: Math.floor(Date.now() / 1000),
          finalized: true,
        });
      });
      
      // Save state after successful submission
      await this.saveState();
      
      this.logger.info(`Aggregated state updates submitted successfully`);
      return true;
    } catch (error) {
      this.logger.error('Error submitting aggregated state updates:', error as Error);
      throw error;
    }
  }

  getStateHistory(): Map<number, string> {
    return new Map(this.stateHistory);
  }

  getBatchHistory(): Map<number, Batch> {
    return new Map(this.batchHistory);
  }

  async getLatestBatches(count: number): Promise<Batch[]> {
    const currentBatch = await this.rollupContract.getCurrentBatchIndex();
    const batches = [];
    
    const startBatch = Math.max(0, Number(currentBatch) - count);
    
    for (let i = startBatch; i < Number(currentBatch); i++) {
      const batch = this.batchHistory.get(i) || await this.rollupContract.getBatch(i);
      batches.push({
        batchIndex: i,
        stateRoot: batch.stateRoot,
        transactionHashes: batch.transactionHashes,
        timestamp: batch.timestamp,
        finalized: batch.finalized,
      });
    }
    
    return batches.reverse();
  }

  async getBatchCount(): Promise<number> {
    const count = await this.rollupContract.getBatchCount();
    return Number(count);
  }

  async getCurrentBatchIndex(): Promise<number> {
    const index = await this.rollupContract.getCurrentBatchIndex();
    return Number(index);
  }
}

export function createStateRootManager(rollupContract: RollupContract): StateRootManager {
  return new StateRootManager(rollupContract);
}
