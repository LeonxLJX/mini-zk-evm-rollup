import { generateProofForBatch, verifyZKProof, ProofResult } from '../../prover/src/prover';
import { Transaction } from '../types';

export class ProofGenerator {
  private pendingProofs: Map<number, Promise<ProofResult>>;
  private proofCache: Map<string, ProofResult>;

  constructor() {
    this.pendingProofs = new Map();
    this.proofCache = new Map();
  }

  async generateProof(
    transactions: Transaction[],
    batchIndex: number
  ): Promise<ProofResult> {
    const cacheKey = this.generateCacheKey(transactions, batchIndex);
    
    if (this.proofCache.has(cacheKey)) {
      return this.proofCache.get(cacheKey)!;
    }

    if (this.pendingProofs.has(batchIndex)) {
      return this.pendingProofs.get(batchIndex)!;
    }

    const proofPromise = this.doGenerateProof(transactions, batchIndex);
    this.pendingProofs.set(batchIndex, proofPromise);

    try {
      const proof = await proofPromise;
      this.proofCache.set(cacheKey, proof);
      return proof;
    } finally {
      this.pendingProofs.delete(batchIndex);
    }
  }

  private async doGenerateProof(
    transactions: Transaction[],
    batchIndex: number
  ): Promise<ProofResult> {
    console.log(`Generating proof for batch ${batchIndex} with ${transactions.length} transactions`);
    
    const startTime = Date.now();
    const proof = await generateProofForBatch(transactions, batchIndex);
    const endTime = Date.now();
    
    console.log(`Proof generated in ${endTime - startTime}ms`);
    return proof;
  }

  async verifyProof(proofData: string, publicValues: any): Promise<boolean> {
    console.log('Verifying proof...');
    
    const startTime = Date.now();
    const isValid = await verifyZKProof(proofData, publicValues);
    const endTime = Date.now();
    
    console.log(`Proof verified in ${endTime - startTime}ms: ${isValid}`);
    return isValid;
  }

  private generateCacheKey(transactions: Transaction[], batchIndex: number): string {
    const txHashes = transactions.map(tx => {
      return `${tx.from}_${tx.to}_${tx.value}_${tx.nonce}`;
    }).join('_');
    return `${batchIndex}_${txHashes}`;
  }

  clearCache(): void {
    this.proofCache.clear();
  }

  getCacheSize(): number {
    return this.proofCache.size;
  }

  getPendingProofsCount(): number {
    return this.pendingProofs.size;
  }
}

export function createProofGenerator(): ProofGenerator {
  return new ProofGenerator();
}
