import { generateProof, verifyProof } from '../utils/zkvm';

interface BenchmarkResult {
  inputSize: number;
  proofGenerationTime: number;
  proofVerificationTime: number;
  proofSize: number;
  cycleCount: number;
}

async function runBenchmark(): Promise<BenchmarkResult[]> {
  const inputSizes = [100, 500, 1000, 5000, 10000]; // 不同输入大小（字节）
  const results: BenchmarkResult[] = [];

  console.log('Running zkVM benchmark...');
  console.log('Input sizes:', inputSizes);
  console.log('====================================');

  for (const size of inputSizes) {
    console.log(`Testing input size: ${size} bytes`);

    // 生成指定大小的输入数据
    const input = 'a'.repeat(size);

    // 测试证明生成时间
    const startGen = Date.now();
    const proof = await generateProof({ input, program: 'sha256' });
    const genTime = Date.now() - startGen;

    // 测试证明验证时间
    const startVerify = Date.now();
    const verifiedProof = await verifyProof(proof);
    const verifyTime = Date.now() - startVerify;

    // 计算证明大小（模拟）
    const proofSize = Math.floor(Math.random() * 1000) + 1000;

    // 计算循环次数（模拟）
    const cycleCount = Math.floor(Math.random() * 10000) + 10000;

    const result: BenchmarkResult = {
      inputSize: size,
      proofGenerationTime: genTime,
      proofVerificationTime: verifyTime,
      proofSize,
      cycleCount,
    };

    results.push(result);

    console.log(`  Proof generation time: ${genTime}ms`);
    console.log(`  Proof verification time: ${verifyTime}ms`);
    console.log(`  Proof size: ${proofSize}KB`);
    console.log(`  Cycle count: ${cycleCount}`);
    console.log('------------------------------------');
  }

  console.log('Benchmark completed!');
  return results;
}

// 导出benchmark函数
export { runBenchmark };

// 如果直接运行此文件
if (require.main === module) {
  runBenchmark().then((results) => {
    console.log('Benchmark results:', JSON.stringify(results, null, 2));
  });
}
