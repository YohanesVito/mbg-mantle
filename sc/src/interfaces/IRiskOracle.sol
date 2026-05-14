// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

interface IRiskOracle {
    /// @notice Per-protocol score record. Scores are scaled by 100 (e.g. 750 = 7.50 / 10.00).
    struct ProtocolScoreData {
        uint16 aggregate;
        uint16 contractRisk;
        uint16 liquidityRisk;
        uint16 centralizationRisk;
        uint16 oracleRisk;
        uint64 timestamp;
        bytes32 traceHash;
        address signer;
    }

    /// @notice An action in a proposed route the agent wants scored.
    struct Action {
        address protocol;
        uint8 actionType; // 0=swap, 1=lend, 2=borrow, 3=stake, 4=bridge, 255=other
        uint128 amount;
    }

    event ScoreUpdated(
        address indexed protocol, uint16 aggregate, bytes32 traceHash, address indexed signer
    );
    event AttestedSignerSet(address indexed signer, bool attested);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    error NotOwner();
    error NotAttestedSigner();
    error InvalidScore();
    error ZeroAddress();
    error EmptyRoute();

    /// @notice TEE-attested signer submits a fresh score for one protocol.
    function submitScore(
        address protocol,
        uint16 aggregate,
        uint16 contractRisk,
        uint16 liquidityRisk,
        uint16 centralizationRisk,
        uint16 oracleRisk,
        bytes32 traceHash
    ) external;

    /// @notice Returns the latest score for a single protocol.
    function getProtocolScore(address protocol) external view returns (ProtocolScoreData memory);

    /// @notice Returns whether a protocol has ever been scored.
    function hasScore(address protocol) external view returns (bool);

    /// @notice Composes per-protocol scores into a route score with composition penalty.
    /// @dev Pure deterministic on-chain composition. Heavy lifting (per-protocol AI scoring)
    ///      happens off-chain inside a TEE; route composition is cheap to verify on-chain.
    function getRouteScore(Action[] calldata actions)
        external
        view
        returns (
            uint16 aggregate,
            uint16 compositionPenalty,
            uint8 distinctProtocols,
            bool allProtocolsScored
        );

    /// @notice Grant / revoke an address's ability to submit scores. Owner only.
    function setAttestedSigner(address signer, bool attested) external;

    function isAttestedSigner(address signer) external view returns (bool);

    function owner() external view returns (address);

    function transferOwnership(address newOwner) external;
}
