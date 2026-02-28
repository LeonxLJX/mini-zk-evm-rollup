'use client';

import { useState, useEffect, useCallback } from 'react';
import { ZKRollup, ZKRollupConfig } from '../lib/zk-rollup';
import { 
  submitTransaction, 
  processBatch, 
  getCurrentStateRoot,
  getBatchCount,
  getLatestBatches 
} from '../lib/rollup-api';

interface RollupStatus {
  stateRoot: string;
  batchCount: number;
  isPaused: boolean;
  isConnected: boolean;
}

export function useZKRollup(config?: ZKRollupConfig) {
  const [rollup, setRollup] = useState<ZKRollup | null>(null);
  const [status, setStatus] = useState<RollupStatus>({
    stateRoot: '',
    batchCount: 0,
    isPaused: false,
    isConnected: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (config) {
      const rollupInstance = new ZKRollup(config);
      rollupInstance.initialize().then(() => {
        setRollup(rollupInstance);
        setStatus(prev => ({ ...prev, isConnected: true }));
        updateStatus(rollupInstance);
      });
    }
  }, [config]);

  const updateStatus = async (rollupInstance: ZKRollup) => {
    try {
      const [stateRoot, batchCount, isPaused] = await Promise.all([
        getCurrentStateRoot(rollupInstance),
        getBatchCount(rollupInstance),
        rollupInstance.isPaused(),
      ]);

      setStatus({
        stateRoot,
        batchCount: Number(batchCount),
        isPaused,
        isConnected: true,
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSubmitTransaction = useCallback(async (tx: any) => {
    if (!rollup) throw new Error('Rollup not initialized');
    setIsLoading(true);
    try {
      const txId = await submitTransaction(rollup, tx);
      await updateStatus(rollup);
      return txId;
    } finally {
      setIsLoading(false);
    }
  }, [rollup]);

  const handleProcessBatch = useCallback(async () => {
    if (!rollup) throw new Error('Rollup not initialized');
    setIsLoading(true);
    try {
      const proof = await processBatch(rollup);
      await updateStatus(rollup);
      return proof;
    } finally {
      setIsLoading(false);
    }
  }, [rollup]);

  const handleGetLatestBatches = useCallback(async (count: number = 10) => {
    if (!rollup) throw new Error('Rollup not initialized');
    return await getLatestBatches(rollup, count);
  }, [rollup]);

  return {
    rollup,
    status,
    isLoading,
    submitTransaction: handleSubmitTransaction,
    processBatch: handleProcessBatch,
    getLatestBatches: handleGetLatestBatches,
    updateStatus: () => rollup && updateStatus(rollup),
  };
}
