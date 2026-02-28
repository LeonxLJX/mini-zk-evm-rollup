import { memo } from 'react';
import { RollupBatch } from '../types';
import { formatTimestamp, formatGas } from '../utils/format';

interface BatchListProps {
  batches: RollupBatch[];
}

const BatchList = memo(({ batches }: BatchListProps) => {
  const statusColors = {
    finalized: 'bg-green-100 text-green-800',
    verified: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <div key={batch.id} className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-lg font-medium">Batch #{batch.batchIndex}</p>
              <p className="text-sm text-gray-600">{batch.rollupName}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[batch.status]}`}>
              {batch.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Transactions</p>
              <p className="font-medium">{batch.transactions.length}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Gas Used</p>
              <p className="font-medium">{formatGas(batch.gasUsed)}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Timestamp</p>
              <p className="font-medium">{formatTimestamp(batch.timestamp)}</p>
            </div>
            {batch.blockNumber && (
              <div className="bg-gray-100 p-4 rounded">
                <p className="text-xs text-gray-600">L1 Block</p>
                <p className="font-medium">{batch.blockNumber.toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

export default BatchList;
