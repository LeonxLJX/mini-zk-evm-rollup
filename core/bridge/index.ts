import { ethers } from 'ethers';
import { RollupContract } from '../../lib/rollup-contract';
import { BridgeTransfer } from '../types';
import { getLogger } from '../utils/logger';

interface Asset {
  address: string;
  symbol: string;
  decimals: number;
  balance: bigint;
}

class AssetManagerImpl implements AssetManager {
  assets: Map<string, Asset>;
  
  constructor() {
    this.assets = new Map();
    // Add default ETH asset
    this.addAsset({
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      decimals: 18,
      balance: 0n
    });
  }

  addAsset(asset: Asset): void {
    this.assets.set(asset.address.toLowerCase(), asset);
  }

  removeAsset(address: string): void {
    this.assets.delete(address.toLowerCase());
  }

  getAsset(address: string): Asset | undefined {
    return this.assets.get(address.toLowerCase());
  }

  updateBalance(address: string, balance: bigint): void {
    const asset = this.assets.get(address.toLowerCase());
    if (asset) {
      asset.balance = balance;
    }
  }

  getAllAssets(): Asset[] {
    return Array.from(this.assets.values());
  }
}

export class BridgeManager {
  private rollupContract: RollupContract;
  private transferHistory: Map<string, BridgeTransfer>;
  private assetManager: AssetManager;
  private logger = getLogger();

  constructor(rollupContract: RollupContract) {
    this.rollupContract = rollupContract;
    this.transferHistory = new Map();
    this.assetManager = new AssetManagerImpl();
  }

  async bridgeAssetToL2(
    from: string,
    to: string,
    amount: bigint,
    tokenAddress?: string
  ): Promise<ethers.ContractTransactionReceipt> {
    this.validateAddress(from);
    this.validateAddress(to);
    
    this.logger.info(`Bridging ${amount} from ${from} to L2 address ${to}`);
    
    let tx;
    if (tokenAddress) {
      this.validateAddress(tokenAddress);
      tx = await this.rollupContract['bridgeAssetToL2(address,address,uint256,address)'](
        from,
        to,
        amount,
        tokenAddress
      );
    } else {
      tx = await this.rollupContract['bridgeAssetToL2(address,address,uint256)'](
        from,
        to,
        amount
      );
    }
    
    const receipt = await tx.wait();
    this.logger.info('Asset bridged successfully');
    
    const transferId = `${receipt.hash}_${Date.now()}`;
    this.transferHistory.set(transferId, {
      from,
      to,
      amount,
      tokenAddress,
      blockNumber: receipt.blockNumber,
      timestamp: Math.floor(Date.now() / 1000),
    });
    
    // Update asset balance
    const assetAddress = tokenAddress || '0x0000000000000000000000000000000000000000';
    const currentBalance = await this.getBridgeBalance(from, tokenAddress);
    this.assetManager.updateBalance(assetAddress, currentBalance);
    
    return receipt;
  }

  async bridgeAssetToL1(
    from: string,
    to: string,
    amount: bigint,
    tokenAddress?: string
  ): Promise<ethers.ContractTransactionReceipt> {
    this.validateAddress(from);
    this.validateAddress(to);
    
    this.logger.info(`Bridging ${amount} from L2 address ${from} to ${to}`);
    
    let tx;
    if (tokenAddress) {
      this.validateAddress(tokenAddress);
      tx = await this.rollupContract['bridgeAssetToL1(address,address,uint256,address)'](
        from,
        to,
        amount,
        tokenAddress
      );
    } else {
      tx = await this.rollupContract['bridgeAssetToL1(address,address,uint256)'](
        from,
        to,
        amount
      );
    }
    
    const receipt = await tx.wait();
    this.logger.info('Asset bridged successfully');
    
    const transferId = `${receipt.hash}_${Date.now()}`;
    this.transferHistory.set(transferId, {
      from,
      to,
      amount,
      tokenAddress,
      blockNumber: receipt.blockNumber,
      timestamp: Math.floor(Date.now() / 1000),
    });
    
    // Update asset balance
    const assetAddress = tokenAddress || '0x0000000000000000000000000000000000000000';
    const currentBalance = await this.getBridgeBalance(from, tokenAddress);
    this.assetManager.updateBalance(assetAddress, currentBalance);
    
    return receipt;
  }

  async getBridgeBalance(address: string, tokenAddress?: string): Promise<bigint> {
    this.validateAddress(address);
    
    if (tokenAddress) {
      this.validateAddress(tokenAddress);
      return await this.rollupContract['bridgeBalances(address,address)'](address, tokenAddress);
    } else {
      return await this.rollupContract['bridgeBalances(address)'](address);
    }
  }

  async getBridgeAllowance(
    owner: string,
    spender: string,
    tokenAddress?: string
  ): Promise<bigint> {
    this.validateAddress(owner);
    this.validateAddress(spender);
    
    if (tokenAddress) {
      this.validateAddress(tokenAddress);
      return await this.rollupContract['bridgeAllowance(address,address,address)'](
        owner,
        spender,
        tokenAddress
      );
    } else {
      return await this.rollupContract['bridgeAllowance(address,address)'](owner, spender);
    }
  }

  async approveBridge(
    spender: string,
    amount: bigint,
    tokenAddress?: string
  ): Promise<ethers.ContractTransactionReceipt> {
    this.validateAddress(spender);
    
    let tx;
    if (tokenAddress) {
      this.validateAddress(tokenAddress);
      tx = await this.rollupContract['approveBridge(address,uint256,address)'](
        spender,
        amount,
        tokenAddress
      );
    } else {
      tx = await this.rollupContract['approveBridge(address,uint256)'](
        spender,
        amount
      );
    }
    
    return await tx.wait();
  }

  private validateAddress(address: string): void {
    if (!ethers.isAddress(address)) {
      throw new Error('Invalid address');
    }
  }

  getTransferHistory(): Map<string, BridgeTransfer> {
    return new Map(this.transferHistory);
  }

  getTransferById(id: string): BridgeTransfer | undefined {
    return this.transferHistory.get(id);
  }

  getLatestTransfers(limit: number = 10): BridgeTransfer[] {
    const transfers = Array.from(this.transferHistory.values());
    return transfers
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
      .slice(0, limit);
  }

  addAsset(address: string, symbol: string, decimals: number): void {
    this.validateAddress(address);
    this.assetManager.addAsset({
      address,
      symbol,
      decimals,
      balance: 0n
    });
    this.logger.info(`Added asset: ${symbol} (${address})`);
  }

  removeAsset(address: string): void {
    this.validateAddress(address);
    this.assetManager.removeAsset(address);
    this.logger.info(`Removed asset: ${address}`);
  }

  getAsset(address: string): Asset | undefined {
    this.validateAddress(address);
    return this.assetManager.getAsset(address);
  }

  getAllAssets(): Asset[] {
    return this.assetManager.getAllAssets();
  }

  async refreshAssetBalances(address: string): Promise<void> {
    this.validateAddress(address);
    const assets = this.assetManager.getAllAssets();
    
    for (const asset of assets) {
      const balance = await this.getBridgeBalance(address, asset.address === '0x0000000000000000000000000000000000000000' ? undefined : asset.address);
      this.assetManager.updateBalance(asset.address, balance);
    }
    
    this.logger.info(`Refreshed asset balances for address: ${address}`);
  }
}

export function createBridgeManager(rollupContract: RollupContract): BridgeManager {
  return new BridgeManager(rollupContract);
}
