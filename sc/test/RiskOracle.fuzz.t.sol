// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RiskOracle} from "../src/RiskOracle.sol";
import {IRiskOracle} from "../src/interfaces/IRiskOracle.sol";

/// @notice Fuzz tests for RiskOracle. Targets:
///   1. submitScore round-trips for any valid input
///   2. submitScore reverts if any of the 5 score fields > MAX_SCORE
///   3. getRouteScore aggregate stays in [0, MAX_SCORE]
///   4. getRouteScore allProtocolsScored is correct relative to submissions
///   5. ownership transfers commute (transfer A->B->C ends at C)
contract RiskOracleFuzzTest is Test {
    RiskOracle oracle;
    address owner = address(0xA11CE);
    address signer = address(0xB0B);
    uint16 constant MAX = 1000;

    function setUp() public {
        oracle = new RiskOracle(owner);
        vm.prank(owner);
        oracle.setAttestedSigner(signer, true);
    }

    // ─── 1. round-trip for any valid input ─────────────────────────────────

    function testFuzz_submitScore_roundTrip(
        address protocol,
        uint16 aggregate,
        uint16 c1,
        uint16 c2,
        uint16 c3,
        uint16 c4,
        bytes32 traceHash
    ) public {
        vm.assume(protocol != address(0));
        aggregate = uint16(bound(uint256(aggregate), 0, MAX));
        c1 = uint16(bound(uint256(c1), 0, MAX));
        c2 = uint16(bound(uint256(c2), 0, MAX));
        c3 = uint16(bound(uint256(c3), 0, MAX));
        c4 = uint16(bound(uint256(c4), 0, MAX));

        vm.prank(signer);
        oracle.submitScore(protocol, aggregate, c1, c2, c3, c4, traceHash);

        IRiskOracle.ProtocolScoreData memory s = oracle.getProtocolScore(protocol);
        assertEq(s.aggregate, aggregate, "aggregate mismatch");
        assertEq(s.contractRisk, c1, "contract mismatch");
        assertEq(s.liquidityRisk, c2, "liquidity mismatch");
        assertEq(s.centralizationRisk, c3, "centralization mismatch");
        assertEq(s.oracleRisk, c4, "oracle mismatch");
        assertEq(s.traceHash, traceHash, "traceHash mismatch");
        assertEq(s.signer, signer, "signer mismatch");
        assertGt(s.timestamp, 0, "timestamp not set");
    }

    // ─── 2. reverts when ANY of the 5 score fields exceeds MAX ─────────────

    function testFuzz_submitScore_revertsIfAnyOverMax(
        uint16 baseValid,
        uint16 overflow,
        uint8 whichField
    ) public {
        baseValid = uint16(bound(uint256(baseValid), 0, MAX));
        // ensure overflow is strictly > MAX
        overflow = uint16(bound(uint256(overflow), MAX + 1, type(uint16).max));
        whichField = uint8(bound(uint256(whichField), 0, 4));

        uint16 a = baseValid;
        uint16 c1 = baseValid;
        uint16 c2 = baseValid;
        uint16 c3 = baseValid;
        uint16 c4 = baseValid;

        if (whichField == 0) a = overflow;
        else if (whichField == 1) c1 = overflow;
        else if (whichField == 2) c2 = overflow;
        else if (whichField == 3) c3 = overflow;
        else c4 = overflow;

        vm.prank(signer);
        vm.expectRevert(IRiskOracle.InvalidScore.selector);
        oracle.submitScore(address(0x1234), a, c1, c2, c3, c4, bytes32(0));
    }

    // ─── 3. route aggregate stays in valid range ───────────────────────────

    function testFuzz_routeScore_aggregateInRange(
        uint16 score1,
        uint16 score2,
        uint16 score3
    ) public {
        score1 = uint16(bound(uint256(score1), 0, MAX));
        score2 = uint16(bound(uint256(score2), 0, MAX));
        score3 = uint16(bound(uint256(score3), 0, MAX));

        address p1 = address(0x1111);
        address p2 = address(0x2222);
        address p3 = address(0x3333);

        vm.startPrank(signer);
        oracle.submitScore(p1, score1, 0, 0, 0, 0, bytes32(0));
        oracle.submitScore(p2, score2, 0, 0, 0, 0, bytes32(0));
        oracle.submitScore(p3, score3, 0, 0, 0, 0, bytes32(0));
        vm.stopPrank();

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](3);
        actions[0] = IRiskOracle.Action({protocol: p1, actionType: 0, amount: 1});
        actions[1] = IRiskOracle.Action({protocol: p2, actionType: 0, amount: 1});
        actions[2] = IRiskOracle.Action({protocol: p3, actionType: 0, amount: 1});

        (uint16 aggregate, uint16 penalty, uint8 distinct, bool allScored) =
            oracle.getRouteScore(actions);

        assertLe(aggregate, MAX, "aggregate exceeded MAX");
        assertEq(penalty, 100, "penalty for 3 distinct should be 100");
        assertEq(distinct, 3, "distinct should be 3");
        assertTrue(allScored, "all should be scored");
    }

    // ─── 4. allProtocolsScored flips false the moment one leg is unscored ──

    function testFuzz_routeScore_allScoredFlagsCorrectly(uint8 unscoredIdx) public {
        unscoredIdx = uint8(bound(uint256(unscoredIdx), 0, 2));

        address p1 = address(0x1111);
        address p2 = address(0x2222);
        address p3 = address(0x3333);
        address[3] memory ps = [p1, p2, p3];

        vm.startPrank(signer);
        for (uint8 i = 0; i < 3; i++) {
            if (i == unscoredIdx) continue;
            oracle.submitScore(ps[i], 500, 0, 0, 0, 0, bytes32(0));
        }
        vm.stopPrank();

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](3);
        actions[0] = IRiskOracle.Action({protocol: p1, actionType: 0, amount: 1});
        actions[1] = IRiskOracle.Action({protocol: p2, actionType: 0, amount: 1});
        actions[2] = IRiskOracle.Action({protocol: p3, actionType: 0, amount: 1});

        (, , uint8 distinct, bool allScored) = oracle.getRouteScore(actions);
        assertEq(distinct, 3, "distinct should be 3");
        assertFalse(allScored, "exactly one is unscored");
    }

    // ─── 5. ownership transfers chain through cleanly ──────────────────────

    function testFuzz_ownership_transferChain(address next, address final_) public {
        vm.assume(next != address(0) && next != owner);
        vm.assume(final_ != address(0) && final_ != next);

        vm.prank(owner);
        oracle.transferOwnership(next);
        assertEq(oracle.owner(), next, "first transfer failed");

        vm.prank(next);
        oracle.transferOwnership(final_);
        assertEq(oracle.owner(), final_, "second transfer failed");

        // The original owner can no longer transfer
        vm.prank(owner);
        vm.expectRevert(IRiskOracle.NotOwner.selector);
        oracle.transferOwnership(owner);
    }

    // ─── 6. only attested signers can submit, regardless of input ──────────

    function testFuzz_submitScore_nonAttestedAlwaysReverts(
        address caller,
        uint16 score
    ) public {
        vm.assume(caller != signer);
        vm.assume(caller != address(0));
        score = uint16(bound(uint256(score), 0, MAX));

        vm.prank(caller);
        vm.expectRevert(IRiskOracle.NotAttestedSigner.selector);
        oracle.submitScore(address(0x1234), score, 0, 0, 0, 0, bytes32(0));
    }

    // ─── 7. distinct count is bounded by route length and unique-set size ──

    function testFuzz_routeScore_distinctCountBounded(uint8 numActions) public {
        numActions = uint8(bound(uint256(numActions), 1, 20));

        address p = address(0xABCD);
        vm.prank(signer);
        oracle.submitScore(p, 700, 0, 0, 0, 0, bytes32(0));

        // Build a route where every action references the SAME protocol
        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](numActions);
        for (uint256 i = 0; i < numActions; i++) {
            actions[i] = IRiskOracle.Action({protocol: p, actionType: 0, amount: 1});
        }

        (uint16 aggregate, uint16 penalty, uint8 distinct, bool allScored) =
            oracle.getRouteScore(actions);

        assertEq(distinct, 1, "all same protocol => distinct = 1");
        assertEq(penalty, 0, "no penalty for distinct=1");
        assertEq(aggregate, 700, "aggregate = the one protocol's score");
        assertTrue(allScored, "the one protocol is scored");
    }
}
