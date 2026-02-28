import { ethers } from 'ethers';
import { RollupContract } from '../lib/rollup-contract';
import { ConfigManager } from './config';
import { BatchProcessor } from './batch-processor';
import { StateRootManager } from './state-manager';
import { BridgeManager } from './bridge';
import { ProofGenerator } from './proof-generator';
import { RollupSequencer } from './sequencer';
import { NetworkManager } from './network';
import { TransactionExecutor } from './executor';
import { SecurityManager, Role } from './security';
import { ZKRollupConfig, Transaction, ProofResult as ProofResultType, Batch, BridgeTransfer, SequencerStatus } from './types';


export class ZKRollup {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private rollupContract: RollupContract;
  private configManager: ConfigManager;
  private batchProcessor: BatchProcessor;
  private stateRootManager: StateRootManager;
  private bridgeManager: BridgeManager;
  private proofGenerator: ProofGenerator;
  private sequencer: RollupSequencer;
  private networkManager: NetworkManager;
  private transactionExecutor: TransactionExecutor;
  private securityManager: SecurityManager;

  constructor(config: ZKRollupConfig) {
    this.configManager = ConfigManager.getInstance(config);
    
    this.provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    
    const rollupABI = this.getRollupABI();
    this.rollupContract = new RollupContract(
      config.rollupContractAddress,
      rollupABI,
      this.provider,
      this.wallet
    );
    
    this.networkManager = new NetworkManager({
      l1RpcUrl: config.l1RpcUrl,
      l2RpcUrl: config.l2RpcUrl || 'http://localhost:8545',
      maxRetries: 3,
      retryInterval: 1000,
      ...config.networkConfig
    });
    
    this.transactionExecutor = new TransactionExecutor({
      maxGasPerTransaction: 1000000,
      maxGasPerBatch: 10000000,
      gasPriceOracle: 'latest',
      executionTimeout: 30000,
      ...config.executorConfig
    });
    
    this.securityManager = new SecurityManager({
      enableAccessControl: config.security?.accessControl ?? true,
      enableAuditLogging: true,
      adminAddresses: [this.wallet.address, ...(config.security?.authorizedAddresses || [])],
      maxFailedAttempts: 5,
      lockoutDuration: 300000, // 5 minutes
    });
    
    this.stateRootManager = new StateRootManager(this.rollupContract);
    this.batchProcessor = new BatchProcessor(
      this.rollupContract,
      this.stateRootManager,
      this.configManager.getBatchConfig()
    );
    this.bridgeManager = new BridgeManager(this.rollupContract);
    this.proofGenerator = new ProofGenerator();
    this.sequencer = new RollupSequencer(
      this.batchProcessor,
      this.bridgeManager,
      this.proofGenerator
    );
  }

  async initialize(): Promise<void> {
    await this.stateRootManager.initialize();
    await this.batchProcessor.initialize();
    await this.networkManager.healthCheck();
    console.log('ZK Rollup initialized');
  }

  private checkAccess(address: string, requiredRole: Role = Role.ADMIN): void {
    this.securityManager.checkAccess(address, requiredRole);
  }

  async submitTransaction(tx: Transaction): Promise<string> {
    this.batchProcessor.addTransaction(tx);
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async submitTransactions(txs: Transaction[]): Promise<string[]> {
    this.batchProcessor.addTransactions(txs);
    return txs.map(() => `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }

  async processBatch(): Promise<ProofResultType[]> {
    if (this.batchProcessor.getPendingTransactionCount() === 0) {
      throw new Error('No pending transactions to process');
    }

    return await this.sequencer.processBatch(this.configManager.getVKeyHash());
  }

  async startSequencer(interval?: number): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.SEQUENCER);
    await this.sequencer.start(
      interval || this.configManager.getBatchInterval(),
      this.configManager.getVKeyHash()
    );
  }

  async stopSequencer(): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.SEQUENCER);
    await this.sequencer.stop();
  }

  async bridgeToL2(
    to: string,
    amount: bigint,
    tokenAddress?: string
  ): Promise<ethers.ContractTransactionReceipt> {
    return await this.bridgeManager.bridgeAssetToL2(
      await this.wallet.getAddress(),
      to,
      amount,
      tokenAddress
    );
  }

  async bridgeToL1(
    to: string,
    amount: bigint,
    tokenAddress?: string
  ): Promise<ethers.ContractTransactionReceipt> {
    return await this.bridgeManager.bridgeAssetToL1(
      await this.wallet.getAddress(),
      to,
      amount,
      tokenAddress
    );
  }

  async getCurrentStateRoot(): Promise<string> {
    return await this.stateRootManager.getCurrentStateRoot();
  }

  async getBatchCount(): Promise<number> {
    return await this.stateRootManager.getBatchCount();
  }

  async getBatch(batchIndex: number): Promise<Batch | undefined> {
    return await this.stateRootManager.getBatch(batchIndex);
  }

  async getLatestBatches(count: number): Promise<Batch[]> {
    return await this.stateRootManager.getLatestBatches(count);
  }

  async pauseRollup(): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.ADMIN);
    await this.rollupContract.pause();
  }

  async unpauseRollup(): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.ADMIN);
    await this.rollupContract.unpause();
  }

  async isPaused(): Promise<boolean> {
    return await this.rollupContract.isPaused();
  }

  async getSequencerStatus(): Promise<SequencerStatus> {
    return this.sequencer.getStatus();
  }

  async getBridgeBalance(address: string, tokenAddress?: string): Promise<bigint> {
    return await this.bridgeManager.getBridgeBalance(address, tokenAddress);
  }

  async getBridgeAllowance(
    owner: string,
    spender: string,
    tokenAddress?: string
  ): Promise<bigint> {
    return await this.bridgeManager.getBridgeAllowance(owner, spender, tokenAddress);
  }

  async approveBridge(
    spender: string,
    amount: bigint,
    tokenAddress?: string
  ): Promise<ethers.ContractTransactionReceipt> {
    return await this.bridgeManager.approveBridge(spender, amount, tokenAddress);
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
      "function bridgeAssetToL2(address from, address to, uint256 amount) external",
      "function bridgeAssetToL2(address from, address to, uint256 amount, address tokenAddress) external",
      "function bridgeAssetToL1(address from, address to, uint256 amount) external",
      "function bridgeAssetToL1(address from, address to, uint256 amount, address tokenAddress) external",
      "function bridgeBalances(address) view returns (uint256)",
      "function bridgeBalances(address, address) view returns (uint256)",
      "function bridgeAllowance(address, address) view returns (uint256)",
      "function bridgeAllowance(address, address, address) view returns (uint256)",
      "function approveBridge(address spender, uint256 amount) external",
      "function approveBridge(address spender, uint256 amount, address tokenAddress) external",
      "event BatchSubmitted(uint256 indexed batchIndex, bytes32 oldStateRoot, bytes32 newStateRoot, uint256 transactionCount)",
      "event StateRootUpdated(uint256 indexed batchIndex, bytes32 oldStateRoot, bytes32 newStateRoot)",
      "event ProofVerified(uint256 indexed batchIndex, bytes32 proofHash)",
      "event BridgeToL2(address indexed from, address indexed to, uint256 amount, address tokenAddress)",
      "event BridgeToL1(address indexed from, address indexed to, uint256 amount, address tokenAddress)",
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

  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  getBatchProcessor(): BatchProcessor {
    return this.batchProcessor;
  }

  getStateRootManager(): StateRootManager {
    return this.stateRootManager;
  }

  getBridgeManager(): BridgeManager {
    return this.bridgeManager;
  }

  getProofGenerator(): ProofGenerator {
    return this.proofGenerator;
  }

  getSequencer(): RollupSequencer {
    return this.sequencer;
  }

  getNetworkManager(): NetworkManager {
    return this.networkManager;
  }

  getTransactionExecutor(): TransactionExecutor {
    return this.transactionExecutor;
  }

  getSecurityManager(): SecurityManager {
    return this.securityManager;
  }

  async addAuthorizedAddress(address: string): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.ADMIN);
    this.securityManager.addRole(address, Role.ADMIN);
  }

  async removeAuthorizedAddress(address: string): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.ADMIN);
    this.securityManager.removeRole(address, Role.ADMIN);
  }

  async getAuthorizedAddresses(): Promise<string[]> {
    return this.securityManager.getAccessControl().getAdminAddresses();
  }

  async isAuthorized(address: string): Promise<boolean> {
    return this.securityManager.getAccessControl().isAdmin(address);
  }

  async addRole(address: string, role: Role): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.ADMIN);
    this.securityManager.addRole(address, role);
  }

  async removeRole(address: string, role: Role): Promise<void> {
    this.checkAccess(await this.wallet.getAddress(), Role.ADMIN);
    this.securityManager.removeRole(address, role);
  }

  async getAuditLogs(limit: number = 100): Promise<any[]> {
    this.checkAccess(await this.wallet.getAddress(), Role.ADMIN);
    return this.securityManager.getAuditLogs(limit);
  }
}

export function createZKRollup(config: ZKRollupConfig): ZKRollup {
  return new ZKRollup(config);
}
