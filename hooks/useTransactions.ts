'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  from: string;
  to: string;
  value: string;
  data: string;
  nonce: number;
  gasLimit: number;
  gasPrice: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  batchId?: string;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setPendingCount(transactions.filter(t => t.status === 'pending').length);
  }, [transactions]);

  const addTransaction = (tx: Omit<Transaction, 'id' | 'timestamp' | 'status'>) => {
    const newTx: Transaction = {
      ...tx,
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      status: 'pending',
    };
    setTransactions(prev => [newTx, ...prev]);
    return newTx;
  };

  const updateTransactionStatus = (
    txId: string,
    status: 'pending' | 'confirmed' | 'failed',
    batchId?: string
  ) => {
    setTransactions(prev =>
      prev.map(t =>
        t.id === txId ? { ...t, status, ...(batchId && { batchId }) } : t
      )
    );
  };

  const removeTransaction = (txId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== txId));
  };

  const clearPendingTransactions = () => {
    setTransactions(prev => prev.filter(t => t.status !== 'pending'));
  };

  const getPendingTransactions = () => {
    return transactions.filter(t => t.status === 'pending');
  };

  const getConfirmedTransactions = () => {
    return transactions.filter(t => t.status === 'confirmed');
  };

  return {
    transactions,
    pendingCount,
    addTransaction,
    updateTransactionStatus,
    removeTransaction,
    clearPendingTransactions,
    getPendingTransactions,
    getConfirmedTransactions,
  };
}
