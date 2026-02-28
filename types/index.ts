export interface ZKRollup {
  id: string;
  name: string;
  description: string;
  status: 'deployed' | 'pending' | 'stopped';
  chainId: number;
  address: string;
  tvl: number;
  totalTransactions: number;
  blockHeight: number;
  lastRollupAt: number;
  createdAt: number;
}

export interface RollupBatch {
  id: string;
  rollupId: string;
  rollupName: string;
  batchIndex: number;
  transactions: Transaction[];
  proofs: ZKProof[];
  status: 'pending' | 'verified' | 'finalized' | 'failed';
  gasUsed: number;
  timestamp: number;
  blockNumber?: number;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  value: bigint;
  data: string;
  gasLimit: bigint;
  gasPrice: bigint;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  batchId?: string;
}

export interface ZKProof {
  id: string;
  batchId: string;
  proofData: string;
  prover: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  verificationTime: number;
  timestamp: number;
  input?: string;
  output?: string;
}

export interface Account {
  address: string;
  balance: bigint;
  nonce: number;
  codeHash: string;
  storageRoot: string;
  lastUpdatedAt: number;
}

export interface L1L2Message {
  id: string;
  direction: 'L1toL2' | 'L2toL1';
  sender: string;
  recipient: string;
  value: bigint;
  data: string;
  status: 'pending' | 'processed' | 'failed';
  timestamp: number;
  processedAt?: number;
}