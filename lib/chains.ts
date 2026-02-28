import { sepolia } from 'wagmi/chains';

export const SUPPORTED_CHAINS = [sepolia];

export const ROLLUP_ADDRESSES = {
  [sepolia.id]: {
    ROLLUP_CORE: '0xYourRollupCoreAddress',
    PROVER_REGISTRY: '0xYourProverRegistryAddress',
    BRIDGE: '0xYourBridgeAddress',
    TOKEN_REGISTRY: '0xYourTokenRegistryAddress',
  },
};

export const L2_CHAIN_CONFIG = {
  chainId: 111551111,
  name: 'Mini ZK EVM Rollup',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['http://localhost:8545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Mini Rollup Explorer',
      url: 'http://localhost:3000/explorer',
    },
  },
};

export const API_ENDPOINTS = {
  ROLLUP_NODE: 'http://localhost:8545',
  PROVER_SERVICE: 'http://localhost:9000',
  BRIDGE_API: 'http://localhost:9500',
  EXPLORER_API: 'http://localhost:3000/api',
};