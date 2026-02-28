// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

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
