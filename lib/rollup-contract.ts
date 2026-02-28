import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs-extra';
import { join } from 'path';

interface StateTransitionProof {
  oldStateRoot: string;
  newStateRoot: string;
  batchIndex: number;
  transactionCount: number;
  transactionHashes: string[];
}

interface ProofResult {
  proofId: string;
  batchIndex: number;
  proofData: string;
  publicValues: StateTransitionProof;
  proofSize: number;
  generationTime: number;
  timestamp: number;
}

export class RollupContract {
  private contract: ethers.Contract;
  private provider: ethers.Provider;
  private signer: ethers.Signer;

  constructor(
    contractAddress: string,
    abi: any[],
    provider: ethers.Provider,
    signer?: ethers.Signer
  ) {
    this.provider = provider;
    this.signer = signer || (provider as ethers.JsonRpcSigner);
    this.contract = new ethers.Contract(contractAddress, abi, this.signer);
  }

  async submitBatch(
    proofData: string,
    transition: StateTransitionProof,
    vKeyHash: string[]
  ): Promise<ethers.ContractTransactionReceipt> {
    try {
      const tx = await this.contract.submitBatch(
        proofData,
        transition,
        vKeyHash
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error submitting batch:', error);
      throw error;
    }
  }

  async submitAggregatedBatch(
    proofData: string,
    transitions: StateTransitionProof[],
    vKeyHash: string[]
  ): Promise<ethers.ContractTransactionReceipt> {
    try {
      const tx = await this.contract.submitAggregatedBatch(
        proofData,
        transitions,
        vKeyHash
      );
      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error submitting aggregated batch:', error);
      throw error;
    }
  }

  async getCurrentStateRoot(): Promise<string> {
    return await this.contract.currentStateRoot();
  }

  async getCurrentBatchIndex(): Promise<bigint> {
    return await this.contract.currentBatchIndex();
  }

  async getBatch(batchIndex: number): Promise<any> {
    return await this.contract.batches(batchIndex);
  }

  async getBatchCount(): Promise<bigint> {
    return await this.contract.getBatchCount();
  }

  async pause(): Promise<ethers.ContractTransactionReceipt> {
    const tx = await this.contract.pause();
    return await tx.wait();
  }

  async unpause(): Promise<ethers.ContractTransactionReceipt> {
    const tx = await this.contract.unpause();
    return await tx.wait();
  }

  async isPaused(): Promise<boolean> {
    return await this.contract.paused();
  }

  onBatchSubmitted(callback: (batchIndex: number, oldRoot: string, newRoot: string, txCount: number) => void) {
    this.contract.on('BatchSubmitted', (batchIndex, oldRoot, newRoot, txCount) => {
      callback(batchIndex, oldRoot, newRoot, txCount);
    });
  }

  onStateRootUpdated(callback: (batchIndex: number, oldRoot: string, newRoot: string) => void) {
    this.contract.on('StateRootUpdated', (batchIndex, oldRoot, newRoot) => {
      callback(batchIndex, oldRoot, newRoot);
    });
  }

  onProofVerified(callback: (batchIndex: number, proofHash: string) => void) {
    this.contract.on('ProofVerified', (batchIndex, proofHash) => {
      callback(batchIndex, proofHash);
    });
  }
}

export class StateRootManager {
  private rollupContract: RollupContract;
  private stateHistory: Map<number, string>;

  constructor(rollupContract: RollupContract) {
    this.rollupContract = rollupContract;
    this.stateHistory = new Map();
  }

  async initialize() {
    const currentBatch = await this.rollupContract.getCurrentBatchIndex();
    
    for (let i = 0; i < Number(currentBatch); i++) {
      const batch = await this.rollupContract.getBatch(i);
      this.stateHistory.set(i, batch.stateRoot);
    }
  }

  async getCurrentStateRoot(): Promise<string> {
    return await this.rollupContract.getCurrentStateRoot();
  }

  getStateRoot(batchIndex: number): string | undefined {
    return this.stateHistory.get(batchIndex);
  }

  async verifyStateTransition(
    oldRoot: string,
    newRoot: string,
    proofResult: ProofResult
  ): Promise<boolean> {
    const expectedOldRoot = proofResult.publicValues.oldStateRoot;
    const expectedNewRoot = proofResult.publicValues.newStateRoot;

    return oldRoot === expectedOldRoot && newRoot === expectedNewRoot;
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
      await this.rollupContract.submitBatch(
        proofResult.proofData,
        proofResult.publicValues,
        vKeyHash
      );
      
      this.stateHistory.set(proofResult.batchIndex, proofResult.publicValues.newStateRoot);
      return true;
    } catch (error) {
      console.error('Error submitting state update:', error);
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
      await this.rollupContract.submitAggregatedBatch(
        proofResults[0].proofData,
        transitions,
        vKeyHash
      );
      
      proofResults.forEach((proof, index) => {
        this.stateHistory.set(proof.batchIndex, proof.publicValues.newStateRoot);
      });
      
      return true;
    } catch (error) {
      console.error('Error submitting aggregated state updates:', error);
      throw error;
    }
  }

  getStateHistory(): Map<number, string> {
    return new Map(this.stateHistory);
  }

  async getLatestBatches(count: number): Promise<any[]> {
    const currentBatch = await this.rollupContract.getCurrentBatchIndex();
    const batches = [];
    
    const startBatch = Math.max(0, Number(currentBatch) - count);
    
    for (let i = startBatch; i < Number(currentBatch); i++) {
      const batch = await this.rollupContract.getBatch(i);
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
}
