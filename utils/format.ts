export function formatAddress(address: string, length: number = 6): string {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
}

export function formatValue(value: bigint | number, decimals: number = 18): string {
  const num = typeof value === 'bigint' ? Number(value) : value;
  const divisor = Math.pow(10, decimals);
  return (num / divisor).toFixed(4);
}

export function formatWei(value: bigint): string {
  const ethValue = Number(value) / 1e18;
  return `${ethValue.toFixed(6)} ETH`;
}

export function formatGas(value: bigint | number): string {
  const num = typeof value === 'bigint' ? Number(value) : value;
  return num.toLocaleString();
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function formatTVL(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatHash(hash: string, length: number = 8): string {
  if (!hash || hash.length < 16) return hash;
  return `${hash.substring(0, length)}...${hash.substring(hash.length - 6)}`;
}
