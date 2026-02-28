import { memo } from 'react';
import { Transaction } from '../types';
import { formatWei, formatGas, formatTimestamp, formatAddress } from '../utils/format';

interface TransactionListProps {
  transactions: Transaction[];
}

const TransactionList = memo(({ transactions }: TransactionListProps) => {
  const statusColors = {
    confirmed: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      {transactions.map((tx) => (
        <div key={tx.id} className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm font-medium">From: {formatAddress(tx.from)}</p>
              <p className="text-sm font-medium">To: {formatAddress(tx.to)}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[tx.status]}`}>
              {tx.status}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Value</p>
              <p className="font-medium">{formatWei(tx.value)}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Gas Limit</p>
              <p className="font-medium">{formatGas(tx.gasLimit)}</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Gas Price</p>
              <p className="font-medium">{formatGas(tx.gasPrice)} wei</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Timestamp</p>
              <p className="font-medium">{formatTimestamp(tx.timestamp)}</p>
            </div>
          </div>
          {tx.batchId && (
            <div className="text-sm text-gray-600">
              <p>Batch ID: {tx.batchId}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
});

export default TransactionList;
