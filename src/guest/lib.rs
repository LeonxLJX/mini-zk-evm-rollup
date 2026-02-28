// Guest program for SHA256 hashing
// This program will be executed within the zkVM

use sha2::{Sha256, Digest};
use sp1_sdk::guest::env;

fn main() {
    // Read input from the host
    let input = env::read::<String>();
    
    // Compute SHA256 hash
    let mut hasher = Sha256::new();
    hasher.update(input);
    let result = hasher.finalize();
    
    // Write the result back to the host
    env::write(&format!("{:x}", result));
}
