'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ZKRollup, RollupBatch, Transaction, ZKProof } from '../types';
import { submitTransaction, getRollupPerformance, processBatchWithProofs } from '../utils/rollup';
import RollupStatus from './RollupStatus';
import BatchList from './BatchList';
import TransactionList from './TransactionList';
import ProofList from './ProofList';
import TransactionForm from './TransactionForm';
import Benchmark from './Benchmark';

// 虚拟钱包实现
const mockAddress = '0x1234567890123456789012345678901234567890';

const Dashboard = () => {
  const address = mockAddress;
  const isConnected = true;
  const [rollups, setRollups] = useState<ZKRollup[]>([]);
  const [batches, setBatches] = useState<RollupBatch[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [proofs, setProofs] = useState<ZKProof[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [performance, setPerformance] = useState<any>(null);
  const [selectedProof, setSelectedProof] = useState<ZKProof | null>(null);

  const mockData = useMemo(() => ({
    rollups: [
      {
        id: '1',
        name: 'Mini ZK EVM Rollup',
        description: 'A minimal ZK EVM rollup for testing purposes',
        status: 'deployed' as const,
        chainId: 111551111,
        address: '0xRollupContractAddress',
        tvl: 1000000,
        totalTransactions: 1234,
        blockHeight: 5678,
        lastRollupAt: Date.now() - 300000,
        createdAt: Date.now() - 86400000,
      },
    ],
    batches: [
      {
        id: '1',
        rollupId: '1',
        rollupName: 'Mini ZK EVM Rollup',
        batchIndex: 123,
        transactions: [],
        proofs: [],
        status: 'finalized' as const,
        gasUsed: 123456789,
        timestamp: Date.now() - 600000,
        blockNumber: 1234567,
      },
      {
        id: '2',
        rollupId: '1',
        rollupName: 'Mini ZK EVM Rollup',
        batchIndex: 124,
        transactions: [],
        proofs: [],
        status: 'verified' as const,
        gasUsed: 987654321,
        timestamp: Date.now() - 300000,
      },
      {
        id: '3',
        rollupId: '1',
        rollupName: 'Mini ZK EVM Rollup',
        batchIndex: 125,
        transactions: [],
        proofs: [],
        status: 'pending' as const,
        gasUsed: 0,
        timestamp: Date.now() - 60000,
      },
    ],
    transactions: [
      {
        id: '1',
        from: mockAddress,
        to: '0xContractAddress',
        value: BigInt('1000000000000000000'),
        data: '0x12345678',
        gasLimit: BigInt('21000'),
        gasPrice: BigInt('1000000000'),
        status: 'confirmed' as const,
        timestamp: Date.now() - 900000,
        batchId: '1',
      },
      {
        id: '2',
        from: mockAddress,
        to: '0xAnotherAddress',
        value: BigInt('500000000000000000'),
        data: '0x',
        gasLimit: BigInt('21000'),
        gasPrice: BigInt('1000000000'),
        status: 'confirmed' as const,
        timestamp: Date.now() - 600000,
        batchId: '1',
      },
      {
        id: '3',
        from: mockAddress,
        to: '0xThirdAddress',
        value: BigInt('200000000000000000'),
        data: '0x',
        gasLimit: BigInt('21000'),
        gasPrice: BigInt('1000000000'),
        status: 'pending' as const,
        timestamp: Date.now() - 300000,
      },
    ],
    proofs: [
      {
        id: '1',
        batchId: '1',
        proofData: '0x1234567890abcdef1234567890abcdef...',
        prover: '0xProverAddress',
        verificationStatus: 'verified' as const,
        verificationTime: 1500,
        timestamp: Date.now() - 840000,
        input: 'Batch 1 data',
        output: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
      },
      {
        id: '2',
        batchId: '2',
        proofData: '0xabcdef1234567890abcdef1234567890...',
        prover: '0xProverAddress',
        verificationStatus: 'verified' as const,
        verificationTime: 1200,
        timestamp: Date.now() - 540000,
        input: 'Batch 2 data',
        output: 'p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1',
      },
    ],
  }), []);

  useEffect(() => {
    // 直接加载数据，不需要钱包连接
    setRollups(mockData.rollups);
    setBatches(mockData.batches);
    setTransactions(mockData.transactions);
    setProofs(mockData.proofs);
    
    // 获取性能指标
    const perf = getRollupPerformance();
    setPerformance(perf);
    
    setIsLoading(false);
  }, [mockData]);

  const handleSubmitTransaction = useCallback(async (to: string, value: string, data: string) => {
    if (!address || !to) return;

    setIsSubmitting(true);
    try {
      const result = await submitTransaction({
        from: address,
        to,
        value: BigInt(value),
        data,
        gasLimit: BigInt('21000'),
        gasPrice: BigInt('1000000000'),
      });

      const newTx: Transaction = {
        id: result.transactionId,
        from: address,
        to,
        value: BigInt(value),
        data,
        gasLimit: BigInt('21000'),
        gasPrice: BigInt('1000000000'),
        status: 'pending',
        timestamp: Date.now(),
      };

      setTransactions(prev => [newTx, ...prev]);
    } catch (error) {
      console.error('Error submitting transaction:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [address]);

  const handleProcessBatch = useCallback(async () => {
    if (transactions.length === 0) return;

    setIsSubmitting(true);
    try {
      const result = await processBatchWithProofs(transactions);
      
      // 更新批次列表
      const newBatch: RollupBatch = {
        id: result.batchId,
        rollupId: '1',
        rollupName: 'Mini ZK EVM Rollup',
        batchIndex: batches.length + 1,
        transactions: [],
        proofs: result.proofs as ZKProof[],
        status: 'finalized' as const,
        gasUsed: 0,
        timestamp: Date.now(),
      };
      
      setBatches(prev => [newBatch, ...prev]);
      
      // 更新证明列表
      setProofs(prev => [...result.proofs as ZKProof[], ...prev]);
      
      // 清空交易列表
      setTransactions([]);
    } catch (error) {
      console.error('Error processing batch:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [transactions, batches.length]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Mini ZK EVM Rollup Dashboard</h1>
        <div className="text-sm text-gray-600">
          Connected: {mockAddress.slice(0, 6)}...{mockAddress.slice(-4)}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Rollup Status</h2>
            {rollups.map((rollup) => (
              <RollupStatus key={rollup.id} rollup={rollup} />
            ))}
          </section>

          {performance && (
            <section>
              <h2 className="text-2xl font-semibold mb-4">Performance Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Proof Generation Time</h3>
                  <p className="text-2xl font-bold">{performance.proofGenerationTime}ms</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Proof Verification Time</h3>
                  <p className="text-2xl font-bold">{performance.proofVerificationTime}ms</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Proof Size</h3>
                  <p className="text-2xl font-bold">{performance.proofSize}KB</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="text-sm font-medium text-gray-500">Cycle Count</h3>
                  <p className="text-2xl font-bold">{performance.cycleCount.toLocaleString()}</p>
                </div>
              </div>
            </section>
          )}

          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Submit Transaction</h2>
              {transactions.length > 0 && (
                <button
                  onClick={handleProcessBatch}
                  disabled={isSubmitting}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Processing...' : 'Process Batch'}
                </button>
              )}
            </div>
            <TransactionForm onSubmit={handleSubmitTransaction} isSubmitting={isSubmitting} />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Recent Batches</h2>
            <BatchList batches={batches} />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Recent Transactions</h2>
            <TransactionList transactions={transactions} />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Recent ZK Proofs</h2>
            <ProofList proofs={proofs} onSelectProof={setSelectedProof} />
          </section>

          {selectedProof && (
            <section>
              <h2 className="text-2xl font-semibold mb-4">Proof Details</h2>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Proof ID</h3>
                    <p className="text-lg font-medium">{selectedProof.id}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Batch ID</h3>
                    <p className="text-lg font-medium">{selectedProof.batchId}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Prover</h3>
                    <p className="text-lg font-medium">{selectedProof.prover}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className={`text-lg font-medium ${selectedProof.verificationStatus === 'verified' ? 'text-green-600' : selectedProof.verificationStatus === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>
                      {selectedProof.verificationStatus}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Verification Time</h3>
                    <p className="text-lg font-medium">{selectedProof.verificationTime}ms</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
                    <p className="text-lg font-medium">{new Date(selectedProof.timestamp).toLocaleString()}</p>
                  </div>
                  {selectedProof.input && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500">Input</h3>
                      <p className="text-lg font-medium break-all">{selectedProof.input}</p>
                    </div>
                  )}
                  {selectedProof.output && (
                    <div className="md:col-span-2">
                      <h3 className="text-sm font-medium text-gray-500">Output (SHA256)</h3>
                      <p className="text-lg font-medium break-all">{selectedProof.output}</p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-gray-500">Proof Data</h3>
                    <p className="text-lg font-medium break-all">{selectedProof.proofData}</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setSelectedProof(null)}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-2xl font-semibold mb-4">Performance Benchmark</h2>
            <Benchmark />
          </section>
        </div>
      )}
    </div>
  );
};

export default Dashboard;