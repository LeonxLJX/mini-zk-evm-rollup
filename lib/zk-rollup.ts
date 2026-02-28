import { ethers } from 'ethers';
import { RollupContract } from './rollup-contract';
import { BatchPoster, L1Bridge, RollupSequencer } from './batch-poster';
import { generateProofForBatch, verifyZKProof, ProofResult } from '../prover/src/prover';

export interface ZKRollupConfig {
  l1RpcUrl: string;
  l2RpcUrl?: string;
  rollupContractAddress: string;
  privateKey: string;
  vKeyHash: string[];
  batchInterval?: number;
  maxTransactionsPerBatch?: number;
}

export class ZKRollup {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private rollupContract: RollupContract;
  private batchPoster: BatchPoster;
  private l1Bridge: L1Bridge;
  private sequencer: RollupSequencer;
  private config: ZKRollupConfig;

  constructor(config: ZKRollupConfig) {
    this.config = config;
    
    this.provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    
    const rollupABI = this.getRollupABI();
    this.rollupContract = new RollupContract(
      config.rollupContractAddress,
      rollupABI,
      this.provider,
      this.wallet
    );
    
    this.batchPoster = new BatchPoster(
      this.rollupContract,
      {
        maxTransactions: config.maxTransactionsPerBatch || 100,
        maxGasLimit: 10000000,
        aggregationSize: 5,
      }
    );
    
    this.l1Bridge = new L1Bridge(this.rollupContract);
    this.sequencer = new RollupSequencer(this.batchPoster, this.l1Bridge);
  }

  async initialize() {
    await this.batchPoster.initialize();
    console.log('ZK Rollup initialized');
  }

  async submitTransaction(tx: any): Promise<string> {
    const formattedTx = {
      from: tx.from,
      to: tx.to,
      value: tx.value.toString(),
      data: tx.data || '0x',
      nonce: tx.nonce || 0,
      gasLimit: tx.gasLimit || 21000,
      gasPrice: tx.gasPrice || 1000000000,
    };

    this.batchPoster.addTransaction(formattedTx);
    return `tx_${Date.now()}`;
  }

  async processBatch(): Promise<ProofResult> {
    if (this.batchPoster.getPendingTransactionCount() === 0) {
      throw new Error('No pending transactions to process');
    }

    return await this.batchPoster.createAndPostBatch(this.config.vKeyHash);
  }

  async startSequencer(interval?: number) {
    await this.sequencer.start(interval || this.config.batchInterval || 30000, this.config.vKeyHash);
  }

  async stopSequencer() {
    await this.sequencer.stop();
  }

  async bridgeToL2(to: string, amount: bigint): Promise<ethers.ContractTransactionReceipt> {
    return await this.l1Bridge.bridgeAssetToL2(await this.wallet.getAddress(), to, amount);
  }

  async bridgeToL1(to: string, amount: bigint): Promise<ethers.ContractTransactionReceipt> {
    return await this.l1Bridge.bridgeAssetToL1(await this.wallet.getAddress(), to, amount);
  }

  async getCurrentStateRoot(): Promise<string> {
    return await this.rollupContract.getCurrentStateRoot();
  }

  async getBatchCount(): Promise<bigint> {
    return await this.rollupContract.getBatchCount();
  }

  async getBatch(batchIndex: number): Promise<any> {
    return await this.rollupContract.getBatch(batchIndex);
  }

  async getLatestBatches(count: number): Promise<any[]> {
    const stateManager = new StateRootManager(this.rollupContract);
    await stateManager.initialize();
    return await stateManager.getLatestBatches(count);
  }

  async pauseRollup(): Promise<void> {
    await this.rollupContract.pause();
  }

  async unpauseRollup(): Promise<void> {
    await this.rollupContract.unpause();
  }

  async isPaused(): Promise<boolean> {
    return await this.rollupContract.isPaused();
  }

  getRollupABI(): any[] {
    return [
      "function submitBatch(bytes proof, tuple(bytes32 oldStateRoot, bytes32 newStateRoot, uint256 batchIndex, uint256 transactionCount, bytes32[] transactionHashes) transition, bytes32[] vKeyHash) external",
      "function submitAggregatedBatch(bytes proof, tuple(bytes32 oldStateRoot, bytes32 newStateRoot, uint256 batchIndex, uint256 transactionCount, bytes32[] transactionHashes)[] transitions, bytes32[] vKeyHash) external",
      "function currentStateRoot() view returns (bytes32)",
      "function currentBatchIndex() view returns (uint256)",
      "function batches(uint256) view returns (tuple(bytes32 stateRoot, bytes32[] transactionHashes, uint256 timestamp, bool finalized))",
      "function getBatchCount() view returns (uint256)",
      "function pause() external",
      "function unpause() external",
      "function paused() view returns (bool)",
      "event BatchSubmitted(uint256 indexed batchIndex, bytes32 oldStateRoot, bytes32 newStateRoot, uint256 transactionCount)",
      "event StateRootUpdated(uint256 indexed batchIndex, bytes32 oldStateRoot, bytes32 newStateRoot)",
      "event ProofVerified(uint256 indexed batchIndex, bytes32 proofHash)",
    ];
  }

  onBatchSubmitted(callback: (batchIndex: number, oldRoot: string, newRoot: string, txCount: number) => void) {
    this.rollupContract.onBatchSubmitted(callback);
  }

  onStateRootUpdated(callback: (batchIndex: number, oldRoot: string, newRoot: string) => void) {
    this.rollupContract.onStateRootUpdated(callback);
  }

  onProofVerified(callback: (batchIndex: number, proofHash: string) => void) {
    this.rollupContract.onProofVerified(callback);
  }
}
