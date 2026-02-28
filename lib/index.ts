import { ZKRollup, ZKRollupConfig } from './lib/zk-rollup';
import { 
  submitTransaction, 
  processBatch, 
  generateZKProof, 
  verifyZKProofOnChain,
  getCurrentStateRoot,
  getBatchCount,
  getLatestBatches,
  bridgeToL2,
  bridgeToL1
} from './lib/rollup-api';

let rollupInstance: ZKRollup | null = null;

export function initializeRollup(config: ZKRollupConfig): ZKRollup {
  if (!rollupInstance) {
    rollupInstance = new ZKRollup(config);
  }
  return rollupInstance;
}

export function getRollupInstance(): ZKRollup | null {
  return rollupInstance;
}

export {
  ZKRollup,
  ZKRollupConfig,
  submitTransaction,
  processBatch,
  generateZKProof,
  verifyZKProofOnChain,
  getCurrentStateRoot,
  getBatchCount,
  getLatestBatches,
  bridgeToL2,
  bridgeToL1
};
