// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import {IRiskOracle} from "./interfaces/IRiskOracle.sol";

/// @title MBG RiskOracle
/// @notice On-chain registry of TEE-attested risk scores for Mantle DeFi protocols.
///         Agents (RealClaw, Brahma, etc.) read this oracle before routing user funds.
///
/// @dev    v0 trust model: scores are submitted by addresses the owner has marked as
///         attested signers. The owner is expected to verify the Phala TDX attestation
///         off-chain before promoting a signer. v1 will move attestation verification
///         on-chain via a dedicated AttestationVerifier contract.
contract RiskOracle is IRiskOracle {
    uint16 public constant MAX_SCORE = 1000; // 10.00 scaled by 100

    mapping(address => ProtocolScoreData) private _scores;
    mapping(address => bool) private _attestedSigners;
    address private _owner;

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Score submission (attested signers only)
    // ────────────────────────────────────────────────────────────────────────────

    function submitScore(
        address protocol,
        uint16 aggregate,
        uint16 contractRisk,
        uint16 liquidityRisk,
        uint16 centralizationRisk,
        uint16 oracleRisk,
        bytes32 traceHash
    ) external override {
        if (!_attestedSigners[msg.sender]) revert NotAttestedSigner();
        if (protocol == address(0)) revert ZeroAddress();
        if (
            aggregate > MAX_SCORE || contractRisk > MAX_SCORE || liquidityRisk > MAX_SCORE
                || centralizationRisk > MAX_SCORE || oracleRisk > MAX_SCORE
        ) revert InvalidScore();

        _scores[protocol] = ProtocolScoreData({
            aggregate: aggregate,
            contractRisk: contractRisk,
            liquidityRisk: liquidityRisk,
            centralizationRisk: centralizationRisk,
            oracleRisk: oracleRisk,
            timestamp: uint64(block.timestamp),
            traceHash: traceHash,
            signer: msg.sender
        });

        emit ScoreUpdated(protocol, aggregate, traceHash, msg.sender);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Reads
    // ────────────────────────────────────────────────────────────────────────────

    function getProtocolScore(address protocol)
        external
        view
        override
        returns (ProtocolScoreData memory)
    {
        return _scores[protocol];
    }

    function hasScore(address protocol) external view override returns (bool) {
        return _scores[protocol].timestamp != 0;
    }

    /// @inheritdoc IRiskOracle
    /// @dev    Composition model (v0):
    ///         - aggregate = mean(protocol_aggregate) - compositionPenalty
    ///         - compositionPenalty = (distinctProtocols - 1) * 50   (= 0.50 per extra protocol)
    ///         If any leg is unscored, allProtocolsScored = false and aggregate is
    ///         computed over the scored subset.
    function getRouteScore(Action[] calldata actions)
        external
        view
        override
        returns (
            uint16 aggregate,
            uint16 compositionPenalty,
            uint8 distinctProtocols,
            bool allProtocolsScored
        )
    {
        uint256 n = actions.length;
        if (n == 0) revert EmptyRoute();

        // Collect distinct protocols and their summed scores.
        address[] memory seen = new address[](n);
        uint8 distinct = 0;
        uint256 scoredSum = 0;
        uint256 scoredCount = 0;
        bool allScored = true;

        for (uint256 i = 0; i < n; i++) {
            address p = actions[i].protocol;
            if (p == address(0)) revert ZeroAddress();

            bool isNew = true;
            for (uint256 j = 0; j < distinct; j++) {
                if (seen[j] == p) {
                    isNew = false;
                    break;
                }
            }
            if (isNew) {
                seen[distinct] = p;
                unchecked {
                    distinct++;
                }

                ProtocolScoreData storage s = _scores[p];
                if (s.timestamp == 0) {
                    allScored = false;
                } else {
                    scoredSum += s.aggregate;
                    scoredCount++;
                }
            }
        }

        uint16 meanAggregate = scoredCount == 0 ? 0 : uint16(scoredSum / scoredCount);

        // 0.50 per additional protocol beyond the first.
        uint16 penalty = distinct > 1 ? uint16((distinct - 1) * 50) : 0;

        uint16 finalAggregate = meanAggregate > penalty ? meanAggregate - penalty : 0;

        return (finalAggregate, penalty, distinct, allScored);
    }

    // ────────────────────────────────────────────────────────────────────────────
    // Admin
    // ────────────────────────────────────────────────────────────────────────────

    function setAttestedSigner(address signer, bool attested) external override onlyOwner {
        if (signer == address(0)) revert ZeroAddress();
        _attestedSigners[signer] = attested;
        emit AttestedSignerSet(signer, attested);
    }

    function isAttestedSigner(address signer) external view override returns (bool) {
        return _attestedSigners[signer];
    }

    function owner() external view override returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external override onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        address previous = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(previous, newOwner);
    }
}
