import { memo } from 'react';
import { ZKRollup } from '../types';
import { formatTVL, formatTimeAgo } from '../utils/format';

interface RollupStatusProps {
  rollup: ZKRollup;
}

const RollupStatus = memo(({ rollup }: RollupStatusProps) => {
  const statusColors = {
    deployed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    stopped: 'bg-red-100 text-red-800',
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-lg font-medium">{rollup.name}</p>
          <p className="text-sm text-gray-600">{rollup.description}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[rollup.status]}`}>
          {rollup.status}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-xs text-gray-600">TVL</p>
          <p className="font-medium">{formatTVL(rollup.tvl)}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-xs text-gray-600">Total Transactions</p>
          <p className="font-medium">{rollup.totalTransactions.toLocaleString()}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-xs text-gray-600">Block Height</p>
          <p className="font-medium">{rollup.blockHeight.toLocaleString()}</p>
        </div>
        <div className="bg-gray-100 p-4 rounded">
          <p className="text-xs text-gray-600">Last Rollup</p>
          <p className="font-medium">{formatTimeAgo(rollup.lastRollupAt)}</p>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        <p>Chain ID: {rollup.chainId}</p>
        <p>Contract Address: {rollup.address}</p>
      </div>
    </div>
  );
});

export default RollupStatus;
