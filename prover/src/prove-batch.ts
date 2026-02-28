import { generateProofForBatch } from './prover';
import { readFileSync, writeFileSync } from 'fs';

async function main() {
  const batchDataPath = process.argv[2];
  
  if (!batchDataPath) {
    console.error('Usage: npm run prove-batch <batch_data_json>');
    process.exit(1);
  }
  
  const batchData = JSON.parse(readFileSync(batchDataPath, 'utf-8'));
  
  console.log(`Generating proof for batch ${batchData.batchIndex} with ${batchData.transactions.length} transactions...`);
  
  const proof = await generateProofForBatch(batchData.transactions, batchData.batchIndex);
  
  console.log('Proof generated successfully!');
  console.log('Proof ID:', proof.proofId);
  console.log('Proof Size:', proof.proofSize, 'bytes');
  console.log('Generation Time:', proof.generationTime, 'ms');
  
  const outputPath = `proof_${proof.proofId}.json`;
  writeFileSync(outputPath, JSON.stringify(proof, null, 2));
  console.log(`Proof saved to: ${outputPath}`);
}

main().catch(console.error);
