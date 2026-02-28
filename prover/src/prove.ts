import { generateProofForBatch, verifyZKProof, ProofResult } from './prover';

async function main() {
  console.log('Generating ZK proof for batch...');
  
  const transactions = [
    {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
      value: '1000000000000000000',
      data: '0x',
      nonce: 0,
      gasLimit: 21000,
      gasPrice: 1000000000,
    },
    {
      from: '0x1234567890123456789012345678901234567890',
      to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      value: '500000000000000000',
      data: '0x12345678',
      nonce: 1,
      gasLimit: 50000,
      gasPrice: 1000000000,
    },
  ];
  
  const proof = await generateProofForBatch(transactions, 1);
  
  console.log('Proof generated successfully!');
  console.log('Proof ID:', proof.proofId);
  console.log('Batch Index:', proof.batchIndex);
  console.log('Proof Size:', proof.proofSize, 'bytes');
  console.log('Generation Time:', proof.generationTime, 'ms');
  console.log('Transaction Count:', proof.publicValues.transactionCount);
  console.log('Old State Root:', proof.publicValues.oldStateRoot);
  console.log('New State Root:', proof.publicValues.newStateRoot);
  
  const isValid = await verifyZKProof(proof.proofData, proof.publicValues);
  console.log('Proof verification:', isValid ? 'VALID' : 'INVALID');
}

main().catch(console.error);
