const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Generating SP1 Verifier contract...");
  
  try {
    const elfPath = path.join(__dirname, "../../sp1-guest/target/sp1-guest-release");
    const outputPath = path.join(__dirname, "../contracts/SP1Verifier.sol");
    
    if (!fs.existsSync(elfPath)) {
      console.error("ELF file not found. Please build the guest program first:");
      console.error("  cd ../../sp1-guest && cargo build --release");
      process.exit(1);
    }
    
    console.log("Building verifier contract from ELF...");
    execSync(`sp1-verifier build ${elfPath} --output ${outputPath}`, {
      stdio: "inherit",
    });
    
    console.log("Verifier contract generated successfully!");
    console.log("Output:", outputPath);
  } catch (error) {
    console.error("Error generating verifier:", error.message);
    process.exit(1);
  }
}

main().catch(console.error);
