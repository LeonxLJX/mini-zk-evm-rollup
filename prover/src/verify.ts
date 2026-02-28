import { verifyZKProof } from './prover';
import { readFileSync } from 'fs';

async function main() {
  const proofData = process.argv[2];
  const publicValuesPath = process.argv[3];
  
  if (!proofData || !publicValuesPath) {
    console.error('Usage: npm run verify <proof_data> <public_values_json>');
    process.exit(1);
  }
  
  const publicValues = JSON.parse(readFileSync(publicValuesPath, 'utf-8'));
  
  console.log('Verifying ZK proof...');
  const isValid = await verifyZKProof(proofData, publicValues);
  
  console.log('Proof verification:', isValid ? 'VALID' : 'INVALID');
  process.exit(isValid ? 0 : 1);
}

main().catch(console.error);
