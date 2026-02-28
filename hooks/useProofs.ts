'use client';

import { useState, useEffect } from 'react';

interface ProofResult {
  proofId: string;
  batchIndex: number;
  proofData: string;
  publicValues: {
    oldStateRoot: string;
    newStateRoot: string;
    batchIndex: number;
    transactionCount: number;
    transactionHashes: string[];
  };
  proofSize: number;
  generationTime: number;
  timestamp: number;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}

export function useProofs() {
  const [proofs, setProofs] = useState<ProofResult[]>([]);
  const [selectedProof, setSelectedProof] = useState<ProofResult | null>(null);

  const addProof = (proof: ProofResult) => {
    setProofs(prev => [proof, ...prev]);
  };

  const updateProofStatus = (proofId: string, status: 'pending' | 'verified' | 'failed') => {
    setProofs(prev =>
      prev.map(p => (p.proofId === proofId ? { ...p, verificationStatus: status } : p))
    );
  };

  const removeProof = (proofId: string) => {
    setProofs(prev => prev.filter(p => p.proofId !== proofId));
  };

  const clearProofs = () => {
    setProofs([]);
  };

  return {
    proofs,
    selectedProof,
    setSelectedProof,
    addProof,
    updateProofStatus,
    removeProof,
    clearProofs,
  };
}
