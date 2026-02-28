use sp1_zkvm::syscalls::syscall_sha256_compress;
use alloy_primitives::{keccak256, Address, B256, U256, Bytes, FixedBytes};
use alloy_rlp::{Encodable, Decodable};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub from: Address,
    pub to: Address,
    pub value: U256,
    pub data: Bytes,
    pub nonce: u64,
    pub gas_limit: u64,
    pub gas_price: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountState {
    pub address: Address,
    pub balance: U256,
    pub nonce: u64,
    pub code_hash: B256,
    pub storage_root: B256,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransition {
    pub transactions: Vec<Transaction>,
    pub old_state_root: B256,
    pub new_state_root: B256,
    pub batch_index: u64,
}

fn hash_transaction(tx: &Transaction) -> B256 {
    let mut encoded = Vec::new();
    tx.encode(&mut encoded);
    keccak256(&encoded)
}

fn compute_state_root(accounts: &[AccountState]) -> B256 {
    let mut combined = Vec::new();
    for account in accounts {
        let mut account_encoded = Vec::new();
        account.encode(&mut account_encoded);
        combined.extend_from_slice(&account_encoded);
    }
    keccak256(&combined)
}

fn execute_transaction(tx: &Transaction, accounts: &mut [AccountState]) -> Result<(), &'static str> {
    let from_idx = accounts.iter().position(|a| a.address == tx.from);
    let to_idx = accounts.iter().position(|a| a.address == tx.to);
    
    let from_idx = from_idx.ok_or("Sender account not found")?;
    let to_idx = to_idx.ok_or("Recipient account not found")?;
    
    let gas_cost = U256::from(tx.gas_limit) * U256::from(tx.gas_price);
    let total_cost = tx.value + gas_cost;
    
    if accounts[from_idx].balance < total_cost {
        return Err("Insufficient balance");
    }
    
    accounts[from_idx].balance -= total_cost;
    accounts[from_idx].nonce += 1;
    accounts[to_idx].balance += tx.value;
    
    Ok(())
}

fn main() {
    sp1_zkvm::entrypoint!(main);
    
    let input: Vec<u8> = sp1_zkvm::io::read_vec();
    let transition: StateTransition = serde_json::from_slice(&input)
        .expect("Failed to parse state transition");
    
    let mut accounts: Vec<AccountState> = vec![
        AccountState {
            address: Address::ZERO,
            balance: U256::from(1000000u64),
            nonce: 0,
            code_hash: B256::ZERO,
            storage_root: B256::ZERO,
        },
    ];
    
    let old_root = compute_state_root(&accounts);
    
    for tx in &transition.transactions {
        if execute_transaction(tx, &mut accounts).is_err() {
            panic!("Transaction execution failed");
        }
    }
    
    let new_root = compute_state_root(&accounts);
    
    let result = StateTransitionProof {
        old_state_root: old_root,
        new_state_root: new_root,
        batch_index: transition.batch_index,
        transaction_count: transition.transactions.len() as u64,
        transaction_hashes: transition.transactions.iter().map(hash_transaction).collect(),
    };
    
    let output = serde_json::to_vec(&result).expect("Failed to serialize result");
    sp1_zkvm::io::commit_slice(&output);
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransitionProof {
    pub old_state_root: B256,
    pub new_state_root: B256,
    pub batch_index: u64,
    pub transaction_count: u64,
    pub transaction_hashes: Vec<B256>,
}

impl Encodable for AccountState {
    fn encode(&self, out: &mut Vec<u8>) {
        self.address.encode(out);
        self.balance.encode(out);
        self.nonce.encode(out);
        self.code_hash.encode(out);
        self.storage_root.encode(out);
    }
}

impl Encodable for Transaction {
    fn encode(&self, out: &mut Vec<u8>) {
        self.from.encode(out);
        self.to.encode(out);
        self.value.encode(out);
        self.data.encode(out);
        self.nonce.encode(out);
        self.gas_limit.encode(out);
        self.gas_price.encode(out);
    }
}
