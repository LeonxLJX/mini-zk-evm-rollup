import { ZKRollupConfig, BatchConfig } from '../types';

export class ConfigManager {
  private static instance: ConfigManager;
  private config: ZKRollupConfig;
  private batchConfig: BatchConfig;

  private constructor(config: ZKRollupConfig) {
    this.config = {
      ...config,
      logging: {
        level: 'info',
        enableFileLogging: false,
        logFilePath: './logs/rollup.log',
        ...config.logging,
      },
      security: {
        enableAccessControl: true,
        authorizedAddresses: [],
        ...config.security,
      },
      gas: {
        maxGasPrice: 100,
        gasMultiplier: 1.1,
        ...config.gas,
      },
      bridge: {
        enabled: true,
        refreshInterval: 10000,
        ...config.bridge,
      },
      prover: {
        path: './prover',
        enableCaching: true,
        cacheSize: 100,
        ...config.prover,
      },
    };
    
    this.batchConfig = {
      maxTransactions: config.maxTransactionsPerBatch || 100,
      maxGasLimit: 10000000,
      aggregationSize: 5,
      batchInterval: config.batchInterval || 30000,
    };
  }

  public static getInstance(config?: ZKRollupConfig): ConfigManager {
    if (!ConfigManager.instance) {
      if (!config) {
        throw new Error('ConfigManager instance not initialized. Provide config on first call.');
      }
      ConfigManager.instance = new ConfigManager(config);
    }
    return ConfigManager.instance;
  }

  public getConfig(): ZKRollupConfig {
    return { ...this.config };
  }

  public getBatchConfig(): BatchConfig {
    return { ...this.batchConfig };
  }

  public updateConfig(newConfig: Partial<ZKRollupConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      logging: {
        ...this.config.logging,
        ...newConfig.logging,
      },
      security: {
        ...this.config.security,
        ...newConfig.security,
      },
      gas: {
        ...this.config.gas,
        ...newConfig.gas,
      },
      bridge: {
        ...this.config.bridge,
        ...newConfig.bridge,
      },
      prover: {
        ...this.config.prover,
        ...newConfig.prover,
      },
    };
    
    this.batchConfig = {
      ...this.batchConfig,
      maxTransactions: newConfig.maxTransactionsPerBatch || this.batchConfig.maxTransactions,
      batchInterval: newConfig.batchInterval || this.batchConfig.batchInterval,
    };
  }

  public updateBatchConfig(newBatchConfig: Partial<BatchConfig>): void {
    this.batchConfig = { ...this.batchConfig, ...newBatchConfig };
  }

  public getL1RpcUrl(): string {
    return this.config.l1RpcUrl;
  }

  public getL2RpcUrl(): string | undefined {
    return this.config.l2RpcUrl;
  }

  public getRollupContractAddress(): string {
    return this.config.rollupContractAddress;
  }

  public getPrivateKey(): string {
    return this.config.privateKey;
  }

  public getVKeyHash(): string[] {
    return [...this.config.vKeyHash];
  }

  public getBatchInterval(): number {
    return this.batchConfig.batchInterval;
  }

  public getMaxTransactionsPerBatch(): number {
    return this.batchConfig.maxTransactions;
  }

  public getAggregationSize(): number {
    return this.batchConfig.aggregationSize;
  }

  public getLoggingConfig(): ZKRollupConfig['logging'] {
    return this.config.logging;
  }

  public getSecurityConfig(): ZKRollupConfig['security'] {
    return this.config.security;
  }

  public getGasConfig(): ZKRollupConfig['gas'] {
    return this.config.gas;
  }

  public getBridgeConfig(): ZKRollupConfig['bridge'] {
    return this.config.bridge;
  }

  public getProverConfig(): ZKRollupConfig['prover'] {
    return this.config.prover;
  }

  public updateLoggingConfig(loggingConfig: Partial<ZKRollupConfig['logging']>): void {
    this.config.logging = { ...this.config.logging, ...loggingConfig };
  }

  public updateSecurityConfig(securityConfig: Partial<ZKRollupConfig['security']>): void {
    this.config.security = { ...this.config.security, ...securityConfig };
  }

  public updateGasConfig(gasConfig: Partial<ZKRollupConfig['gas']>): void {
    this.config.gas = { ...this.config.gas, ...gasConfig };
  }

  public updateBridgeConfig(bridgeConfig: Partial<ZKRollupConfig['bridge']>): void {
    this.config.bridge = { ...this.config.bridge, ...bridgeConfig };
  }

  public updateProverConfig(proverConfig: Partial<ZKRollupConfig['prover']>): void {
    this.config.prover = { ...this.config.prover, ...proverConfig };
  }

  public loadConfigFromFile(filePath: string): void {
    try {
      const fs = require('fs');
      const configData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      this.updateConfig(configData);
      console.log(`Config loaded from ${filePath}`);
    } catch (error) {
      console.error(`Error loading config from ${filePath}:`, error);
    }
  }

  public saveConfigToFile(filePath: string): void {
    try {
      const fs = require('fs');
      const dir = require('path').dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(this.config, null, 2));
      console.log(`Config saved to ${filePath}`);
    } catch (error) {
      console.error(`Error saving config to ${filePath}:`, error);
    }
  }
}

export function createConfigManager(config: ZKRollupConfig): ConfigManager {
  return ConfigManager.getInstance(config);
}
