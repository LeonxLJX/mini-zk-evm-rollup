const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ZKEVMRollup", function () {
  let rollup;
  let verifier;
  let owner;
  let user;
  
  const initialStateRoot = ethers.keccak256(ethers.toUtf8Bytes("initial-state"));
  
  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();
    
    const Verifier = await ethers.getContractFactory("MockSP1Verifier");
    verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    
    const ZKEVMRollup = await ethers.getContractFactory("ZKEVMRollup");
    rollup = await ZKEVMRollup.deploy(
      await verifier.getAddress(),
      initialStateRoot
    );
    await rollup.waitForDeployment();
  });
  
  describe("Deployment", function () {
    it("Should set the correct initial state root", async function () {
      expect(await rollup.currentStateRoot()).to.equal(initialStateRoot);
    });
    
    it("Should set batch index to 0", async function () {
      expect(await rollup.currentBatchIndex()).to.equal(0);
    });
    
    it("Should set the deployer as owner", async function () {
      expect(await rollup.owner()).to.equal(owner.address);
    });
  });
  
  describe("Batch Submission", function () {
    it("Should accept a valid batch submission", async function () {
      const proof = ethers.hexlify(ethers.randomBytes(1024));
      const vKeyHash = [ethers.hexlify(ethers.randomBytes(32))];
      
      const transition = {
        oldStateRoot: initialStateRoot,
        newStateRoot: ethers.keccak256(ethers.toUtf8Bytes("new-state")),
        batchIndex: 0,
        transactionCount: 10,
        transactionHashes: [
          ethers.hexlify(ethers.randomBytes(32)),
          ethers.hexlify(ethers.randomBytes(32)),
        ],
      };
      
      await verifier.setValidProof(true);
      
      await expect(
        rollup.submitBatch(proof, transition, vKeyHash)
      ).to.emit(rollup, "BatchSubmitted")
        .withArgs(0, initialStateRoot, transition.newStateRoot, 10);
    });
    
    it("Should reject batch with invalid old state root", async function () {
      const proof = ethers.hexlify(ethers.randomBytes(1024));
      const vKeyHash = [ethers.hexlify(ethers.randomBytes(32))];
      
      const transition = {
        oldStateRoot: ethers.keccak256(ethers.toUtf8Bytes("wrong-root")),
        newStateRoot: ethers.keccak256(ethers.toUtf8Bytes("new-state")),
        batchIndex: 0,
        transactionCount: 10,
        transactionHashes: [],
      };
      
      await expect(
        rollup.submitBatch(proof, transition, vKeyHash)
      ).to.be.revertedWithCustomError(rollup, "InvalidStateRoot");
    });
    
    it("Should reject batch with wrong batch index", async function () {
      const proof = ethers.hexlify(ethers.randomBytes(1024));
      const vKeyHash = [ethers.hexlify(ethers.randomBytes(32))];
      
      const transition = {
        oldStateRoot: initialStateRoot,
        newStateRoot: ethers.keccak256(ethers.toUtf8Bytes("new-state")),
        batchIndex: 5,
        transactionCount: 10,
        transactionHashes: [],
      };
      
      await expect(
        rollup.submitBatch(proof, transition, vKeyHash)
      ).to.be.revertedWithCustomError(rollup, "InvalidBatchIndex");
    });
    
    it("Should update state root after valid submission", async function () {
      const proof = ethers.hexlify(ethers.randomBytes(1024));
      const vKeyHash = [ethers.hexlify(ethers.randomBytes(32))];
      
      const newStateRoot = ethers.keccak256(ethers.toUtf8Bytes("new-state"));
      const transition = {
        oldStateRoot: initialStateRoot,
        newStateRoot: newStateRoot,
        batchIndex: 0,
        transactionCount: 10,
        transactionHashes: [],
      };
      
      await verifier.setValidProof(true);
      await rollup.submitBatch(proof, transition, vKeyHash);
      
      expect(await rollup.currentStateRoot()).to.equal(newStateRoot);
      expect(await rollup.currentBatchIndex()).to.equal(1);
    });
  });
  
  describe("Aggregated Batch Submission", function () {
    it("Should accept valid aggregated batches", async function () {
      const proof = ethers.hexlify(ethers.randomBytes(2048));
      const vKeyHash = [ethers.hexlify(ethers.randomBytes(32))];
      
      const transitions = [
        {
          oldStateRoot: initialStateRoot,
          newStateRoot: ethers.keccak256(ethers.toUtf8Bytes("state-1")),
          batchIndex: 0,
          transactionCount: 10,
          transactionHashes: [],
        },
        {
          oldStateRoot: ethers.keccak256(ethers.toUtf8Bytes("state-1")),
          newStateRoot: ethers.keccak256(ethers.toUtf8Bytes("state-2")),
          batchIndex: 1,
          transactionCount: 15,
          transactionHashes: [],
        },
      ];
      
      await verifier.setValidProof(true);
      
      await expect(
        rollup.submitAggregatedBatch(proof, transitions, vKeyHash)
      ).to.emit(rollup, "BatchSubmitted");
      
      expect(await rollup.currentBatchIndex()).to.equal(2);
    });
  });
  
  describe("Pausability", function () {
    it("Should allow owner to pause", async function () {
      await rollup.pause();
      expect(await rollup.paused()).to.be.true;
    });
    
    it("Should allow owner to unpause", async function () {
      await rollup.pause();
      await rollup.unpause();
      expect(await rollup.paused()).to.be.false;
    });
    
    it("Should reject batch submission when paused", async function () {
      await rollup.pause();
      
      const proof = ethers.hexlify(ethers.randomBytes(1024));
      const vKeyHash = [ethers.hexlify(ethers.randomBytes(32))];
      
      const transition = {
        oldStateRoot: initialStateRoot,
        newStateRoot: ethers.keccak256(ethers.toUtf8Bytes("new-state")),
        batchIndex: 0,
        transactionCount: 10,
        transactionHashes: [],
      };
      
      await expect(
        rollup.submitBatch(proof, transition, vKeyHash)
      ).to.be.revertedWithCustomError(rollup, "EnforcedPause");
    });
  });
});

contract MockSP1Verifier {
  bool public validProof = false;
  
  function setValidProof(bool _valid) public {
    validProof = _valid;
  }
  
  function verifyProof(
    bytes calldata,
    bytes32,
    bytes32[] calldata
  ) external view returns (bool) {
    return validProof;
  }
}
