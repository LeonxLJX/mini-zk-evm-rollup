import { ZKRollup, ZKRollupConfig } from './zk-rollup';
import { generateProofForBatch, verifyZKProof, ProofResult } from '../prover/src/prover';

export async function submitTransaction(
  rollup: ZKRollup,
  tx: any
): Promise<string> {
  return await rollup.submitTransaction(tx);
}

export async function processBatch(
  rollup: ZKRollup
): Promise<ProofResult> {
  return await rollup.processBatch();
}

export async function generateZKProof(
  transactions: any[],
  batchIndex: number
): Promise<ProofResult> {
  return await generateProofForBatch(transactions, batchIndex);
}

export async function verifyZKProofOnChain(
  rollup: ZKRollup,
  proofData: string,
  publicValues: any
): Promise<boolean> {
  return await verifyZKProof(proofData, publicValues);
}

export async function getCurrentStateRoot(rollup: ZKRollup): Promise<string> {
  return await rollup.getCurrentStateRoot();
}

export async function getBatchCount(rollup: ZKRollup): Promise<bigint> {
  return await rollup.getBatchCount();
}

export async function getLatestBatches(
  rollup: ZKRollup,
  count: number
): Promise<any[]> {
  return await rollup.getLatestBatches(count);
}

export async function bridgeToL2(
  rollup: ZKRollup,
  to: string,
  amount: bigint
): Promise<any> {
  return await rollup.bridgeToL2(to, amount);
}

export async function bridgeToL1(
  rollup: ZKRollup,
  to: string,
  amount: bigint
): Promise<any> {
  return await rollup.bridgeToL1(to, amount);
}
