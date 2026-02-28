// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

interface ISP1Verifier {
    function verifyProof(
        bytes calldata proof,
        bytes32 publicValuesHash,
        bytes32[] calldata vKeyHash
    ) external view returns (bool);
}

interface IStateTransitionProof {
    bytes32 oldStateRoot;
    bytes32 newStateRoot;
    uint256 batchIndex;
    uint256 transactionCount;
    bytes32[] transactionHashes;
}

contract ZKEVMRollup is Ownable, ReentrancyGuard, Pausable {
    ISP1Verifier public immutable verifier;
    
    bytes32 public currentStateRoot;
    uint256 public currentBatchIndex;
    
    mapping(uint256 => Batch) public batches;
    mapping(bytes32 => bool) public processedProofs;
    
    struct Batch {
        bytes32 stateRoot;
        bytes32[] transactionHashes;
        uint256 timestamp;
        bool finalized;
    }
    
    struct StateTransition {
        bytes32 oldStateRoot;
        bytes32 newStateRoot;
        uint256 batchIndex;
        uint256 transactionCount;
        bytes32[] transactionHashes;
    }
    
    event BatchSubmitted(
        uint256 indexed batchIndex,
        bytes32 oldStateRoot,
        bytes32 newStateRoot,
        uint256 transactionCount
    );
    
    event StateRootUpdated(
        uint256 indexed batchIndex,
        bytes32 oldStateRoot,
        bytes32 newStateRoot
    );
    
    event ProofVerified(
        uint256 indexed batchIndex,
        bytes32 proofHash
    );
    
    error InvalidStateRoot();
    error InvalidBatchIndex();
    error ProofAlreadyProcessed();
    error InvalidProof();
    error StateTransitionFailed();
    
    constructor(
        address _verifier,
        bytes32 _initialStateRoot
    ) Ownable(msg.sender) {
        verifier = ISP1Verifier(_verifier);
        currentStateRoot = _initialStateRoot;
        currentBatchIndex = 0;
    }
    
    function submitBatch(
        bytes calldata proof,
        StateTransition calldata transition,
        bytes32[] calldata vKeyHash
    ) external nonReentrant whenNotPaused {
        bytes32 proofHash = keccak256(proof);
        
        if (processedProofs[proofHash]) {
            revert ProofAlreadyProcessed();
        }
        
        if (transition.oldStateRoot != currentStateRoot) {
            revert InvalidStateRoot();
        }
        
        if (transition.batchIndex != currentBatchIndex) {
            revert InvalidBatchIndex();
        }
        
        bytes32 publicValuesHash = hashPublicValues(transition);
        
        bool isValid = verifier.verifyProof(proof, publicValuesHash, vKeyHash);
        if (!isValid) {
            revert InvalidProof();
        }
        
        processedProofs[proofHash] = true;
        
        batches[transition.batchIndex] = Batch({
            stateRoot: transition.newStateRoot,
            transactionHashes: transition.transactionHashes,
            timestamp: block.timestamp,
            finalized: true
        });
        
        currentStateRoot = transition.newStateRoot;
        currentBatchIndex++;
        
        emit BatchSubmitted(
            transition.batchIndex,
            transition.oldStateRoot,
            transition.newStateRoot,
            transition.transactionCount
        );
        
        emit StateRootUpdated(
            transition.batchIndex,
            transition.oldStateRoot,
            transition.newStateRoot
        );
        
        emit ProofVerified(transition.batchIndex, proofHash);
    }
    
    function submitAggregatedBatch(
        bytes calldata proof,
        StateTransition[] calldata transitions,
        bytes32[] calldata vKeyHash
    ) external nonReentrant whenNotPaused {
        bytes32 proofHash = keccak256(proof);
        
        if (processedProofs[proofHash]) {
            revert ProofAlreadyProcessed();
        }
        
        bytes32 expectedOldRoot = currentStateRoot;
        uint256 expectedBatchIndex = currentBatchIndex;
        
        for (uint256 i = 0; i < transitions.length; i++) {
            StateTransition calldata transition = transitions[i];
            
            if (transition.oldStateRoot != expectedOldRoot) {
                revert InvalidStateRoot();
            }
            
            if (transition.batchIndex != expectedBatchIndex) {
                revert InvalidBatchIndex();
            }
            
            expectedOldRoot = transition.newStateRoot;
            expectedBatchIndex++;
        }
        
        bytes32 publicValuesHash = hashAggregatedPublicValues(transitions);
        
        bool isValid = verifier.verifyProof(proof, publicValuesHash, vKeyHash);
        if (!isValid) {
            revert InvalidProof();
        }
        
        processedProofs[proofHash] = true;
        
        for (uint256 i = 0; i < transitions.length; i++) {
            StateTransition calldata transition = transitions[i];
            
            batches[transition.batchIndex] = Batch({
                stateRoot: transition.newStateRoot,
                transactionHashes: transition.transactionHashes,
                timestamp: block.timestamp,
                finalized: true
            });
            
            emit BatchSubmitted(
                transition.batchIndex,
                transition.oldStateRoot,
                transition.newStateRoot,
                transition.transactionCount
            );
            
            emit StateRootUpdated(
                transition.batchIndex,
                transition.oldStateRoot,
                transition.newStateRoot
            );
        }
        
        currentStateRoot = transitions[transitions.length - 1].newStateRoot;
        currentBatchIndex = expectedBatchIndex;
        
        emit ProofVerified(transitions[0].batchIndex, proofHash);
    }
    
    function hashPublicValues(StateTransition calldata transition) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                transition.oldStateRoot,
                transition.newStateRoot,
                transition.batchIndex,
                transition.transactionCount,
                keccak256(abi.encodePacked(transition.transactionHashes))
            )
        );
    }
    
    function hashAggregatedPublicValues(StateTransition[] calldata transitions) public pure returns (bytes32) {
        bytes32[] memory hashes = new bytes32[](transitions.length);
        
        for (uint256 i = 0; i < transitions.length; i++) {
            hashes[i] = hashPublicValues(transitions[i]);
        }
        
        return keccak256(abi.encodePacked(hashes));
    }
    
    function getBatch(uint256 batchIndex) external view returns (Batch memory) {
        return batches[batchIndex];
    }
    
    function getBatchCount() external view returns (uint256) {
        return currentBatchIndex;
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    function updateVerifier(address newVerifier) external onlyOwner {
        emit VerifierUpdated(address(verifier), newVerifier);
    }
    
    event VerifierUpdated(address oldVerifier, address newVerifier);
}
