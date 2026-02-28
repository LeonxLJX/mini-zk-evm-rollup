import { memo } from 'react';
import { ZKProof } from '../types';
import { formatTimestamp, formatHash } from '../utils/format';

interface ProofListProps {
  proofs: ZKProof[];
  onSelectProof?: (proof: ZKProof) => void;
}

const ProofList = memo(({ proofs, onSelectProof }: ProofListProps) => {
  const statusColors = {
    verified: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-4">
      {proofs.map((proof) => (
        <div 
          key={proof.id} 
          className={`bg-white p-6 rounded-lg shadow ${onSelectProof ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
          onClick={() => onSelectProof?.(proof)}
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-lg font-medium">Proof for Batch {proof.batchId}</p>
              <p className="text-sm text-gray-600">Prover: {formatHash(proof.prover)}</p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[proof.verificationStatus]}`}>
              {proof.verificationStatus}
            </span>
          </div>
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">Proof Data:</p>
            <div className="bg-gray-100 p-4 rounded overflow-x-auto">
              <code className="text-xs">{formatHash(proof.proofData, 20)}</code>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Verification Time</p>
              <p className="font-medium">{proof.verificationTime}ms</p>
            </div>
            <div className="bg-gray-100 p-4 rounded">
              <p className="text-xs text-gray-600">Timestamp</p>
              <p className="font-medium">{formatTimestamp(proof.timestamp)}</p>
            </div>
            {onSelectProof && (
              <div className="flex items-end">
                <button
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectProof(proof);
                  }}
                >
                  View Details
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});

export default ProofList;
