// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {RiskOracle} from "../src/RiskOracle.sol";
import {IRiskOracle} from "../src/interfaces/IRiskOracle.sol";

contract RiskOracleTest is Test {
    RiskOracle oracle;

    address owner = address(0xA11CE);
    address signer = address(0xB0B);
    address otherSigner = address(0xCAFE);
    address attacker = address(0xBAD);

    address aaveV3 = address(0x1111);
    address lendle = address(0x2222);
    address methProtocol = address(0x3333);
    address merchantMoe = address(0x4444);

    bytes32 traceHash = keccak256("trace-1");

    function setUp() public {
        oracle = new RiskOracle(owner);
        vm.prank(owner);
        oracle.setAttestedSigner(signer, true);
    }

    // ─── construction ──────────────────────────────────────────────────────────

    function test_constructor_setsOwner() public view {
        assertEq(oracle.owner(), owner);
    }

    function test_constructor_rejectsZeroOwner() public {
        vm.expectRevert(IRiskOracle.ZeroAddress.selector);
        new RiskOracle(address(0));
    }

    // ─── attested signer management ────────────────────────────────────────────

    function test_setAttestedSigner_ownerCan() public {
        vm.prank(owner);
        oracle.setAttestedSigner(otherSigner, true);
        assertTrue(oracle.isAttestedSigner(otherSigner));
    }

    function test_setAttestedSigner_nonOwnerCannot() public {
        vm.prank(attacker);
        vm.expectRevert(IRiskOracle.NotOwner.selector);
        oracle.setAttestedSigner(otherSigner, true);
    }

    function test_setAttestedSigner_canRevoke() public {
        vm.prank(owner);
        oracle.setAttestedSigner(signer, false);
        assertFalse(oracle.isAttestedSigner(signer));
    }

    function test_setAttestedSigner_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IRiskOracle.AttestedSignerSet(otherSigner, true);
        vm.prank(owner);
        oracle.setAttestedSigner(otherSigner, true);
    }

    // ─── score submission ──────────────────────────────────────────────────────

    function test_submitScore_attestedSignerCan() public {
        vm.prank(signer);
        oracle.submitScore(aaveV3, 555, 415, 856, 500, 500, traceHash);

        IRiskOracle.ProtocolScoreData memory s = oracle.getProtocolScore(aaveV3);
        assertEq(s.aggregate, 555);
        assertEq(s.contractRisk, 415);
        assertEq(s.liquidityRisk, 856);
        assertEq(s.centralizationRisk, 500);
        assertEq(s.oracleRisk, 500);
        assertEq(s.traceHash, traceHash);
        assertEq(s.signer, signer);
        assertGt(s.timestamp, 0);
    }

    function test_submitScore_unattestedCannot() public {
        vm.prank(attacker);
        vm.expectRevert(IRiskOracle.NotAttestedSigner.selector);
        oracle.submitScore(aaveV3, 555, 415, 856, 500, 500, traceHash);
    }

    function test_submitScore_revertsOnZeroProtocol() public {
        vm.prank(signer);
        vm.expectRevert(IRiskOracle.ZeroAddress.selector);
        oracle.submitScore(address(0), 555, 415, 856, 500, 500, traceHash);
    }

    function test_submitScore_revertsOnAggregateOverMax() public {
        vm.prank(signer);
        vm.expectRevert(IRiskOracle.InvalidScore.selector);
        oracle.submitScore(aaveV3, 1001, 415, 856, 500, 500, traceHash);
    }

    function test_submitScore_revertsOnComponentOverMax() public {
        vm.prank(signer);
        vm.expectRevert(IRiskOracle.InvalidScore.selector);
        oracle.submitScore(aaveV3, 555, 1001, 856, 500, 500, traceHash);
    }

    function test_submitScore_overwritesPreviousScore() public {
        vm.prank(signer);
        oracle.submitScore(aaveV3, 555, 415, 856, 500, 500, traceHash);

        bytes32 newHash = keccak256("trace-2");
        vm.warp(block.timestamp + 100);
        vm.prank(signer);
        oracle.submitScore(aaveV3, 600, 500, 800, 550, 550, newHash);

        IRiskOracle.ProtocolScoreData memory s = oracle.getProtocolScore(aaveV3);
        assertEq(s.aggregate, 600);
        assertEq(s.traceHash, newHash);
    }

    function test_submitScore_emitsEvent() public {
        vm.expectEmit(true, false, false, true);
        emit IRiskOracle.ScoreUpdated(aaveV3, 555, traceHash, signer);
        vm.prank(signer);
        oracle.submitScore(aaveV3, 555, 415, 856, 500, 500, traceHash);
    }

    // ─── reads ─────────────────────────────────────────────────────────────────

    function test_hasScore_falseBeforeSubmission() public view {
        assertFalse(oracle.hasScore(aaveV3));
    }

    function test_hasScore_trueAfterSubmission() public {
        vm.prank(signer);
        oracle.submitScore(aaveV3, 555, 415, 856, 500, 500, traceHash);
        assertTrue(oracle.hasScore(aaveV3));
    }

    // ─── route scoring ─────────────────────────────────────────────────────────

    function test_getRouteScore_singleProtocol_noPenalty() public {
        vm.prank(signer);
        oracle.submitScore(aaveV3, 800, 800, 800, 800, 800, traceHash);

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](1);
        actions[0] = IRiskOracle.Action({protocol: aaveV3, actionType: 1, amount: 1000});

        (uint16 aggregate, uint16 penalty, uint8 distinct, bool allScored) =
            oracle.getRouteScore(actions);

        assertEq(aggregate, 800);
        assertEq(penalty, 0);
        assertEq(distinct, 1);
        assertTrue(allScored);
    }

    function test_getRouteScore_twoProtocols_appliesPenalty() public {
        vm.startPrank(signer);
        oracle.submitScore(aaveV3, 800, 0, 0, 0, 0, traceHash);
        oracle.submitScore(lendle, 600, 0, 0, 0, 0, traceHash);
        vm.stopPrank();

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](2);
        actions[0] = IRiskOracle.Action({protocol: aaveV3, actionType: 1, amount: 1000});
        actions[1] = IRiskOracle.Action({protocol: lendle, actionType: 2, amount: 500});

        (uint16 aggregate, uint16 penalty, uint8 distinct, bool allScored) =
            oracle.getRouteScore(actions);

        // mean = (800 + 600) / 2 = 700; penalty = 50; aggregate = 650
        assertEq(aggregate, 650);
        assertEq(penalty, 50);
        assertEq(distinct, 2);
        assertTrue(allScored);
    }

    function test_getRouteScore_threeProtocols_penalty100() public {
        vm.startPrank(signer);
        oracle.submitScore(aaveV3, 900, 0, 0, 0, 0, traceHash);
        oracle.submitScore(lendle, 600, 0, 0, 0, 0, traceHash);
        oracle.submitScore(methProtocol, 300, 0, 0, 0, 0, traceHash);
        vm.stopPrank();

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](3);
        actions[0] = IRiskOracle.Action({protocol: aaveV3, actionType: 1, amount: 1000});
        actions[1] = IRiskOracle.Action({protocol: lendle, actionType: 2, amount: 500});
        actions[2] = IRiskOracle.Action({protocol: methProtocol, actionType: 3, amount: 250});

        (uint16 aggregate, uint16 penalty, uint8 distinct,) = oracle.getRouteScore(actions);

        // mean = 600; penalty = 100; aggregate = 500
        assertEq(aggregate, 500);
        assertEq(penalty, 100);
        assertEq(distinct, 3);
    }

    function test_getRouteScore_duplicateProtocolCountsOnce() public {
        vm.prank(signer);
        oracle.submitScore(aaveV3, 800, 0, 0, 0, 0, traceHash);

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](2);
        actions[0] = IRiskOracle.Action({protocol: aaveV3, actionType: 1, amount: 1000});
        actions[1] = IRiskOracle.Action({protocol: aaveV3, actionType: 2, amount: 500});

        (uint16 aggregate, uint16 penalty, uint8 distinct,) = oracle.getRouteScore(actions);

        assertEq(aggregate, 800);
        assertEq(penalty, 0);
        assertEq(distinct, 1);
    }

    function test_getRouteScore_unscoredProtocolFlagsAllScoredFalse() public {
        vm.prank(signer);
        oracle.submitScore(aaveV3, 800, 0, 0, 0, 0, traceHash);

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](2);
        actions[0] = IRiskOracle.Action({protocol: aaveV3, actionType: 1, amount: 1000});
        actions[1] = IRiskOracle.Action({protocol: merchantMoe, actionType: 0, amount: 500});

        (uint16 aggregate,, uint8 distinct, bool allScored) = oracle.getRouteScore(actions);

        // mean over scored subset = 800; penalty for 2 distinct = 50
        assertEq(aggregate, 750);
        assertEq(distinct, 2);
        assertFalse(allScored);
    }

    function test_getRouteScore_emptyRouteReverts() public {
        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](0);
        vm.expectRevert(IRiskOracle.EmptyRoute.selector);
        oracle.getRouteScore(actions);
    }

    function test_getRouteScore_zeroProtocolReverts() public {
        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](1);
        actions[0] = IRiskOracle.Action({protocol: address(0), actionType: 0, amount: 0});
        vm.expectRevert(IRiskOracle.ZeroAddress.selector);
        oracle.getRouteScore(actions);
    }

    function test_getRouteScore_penaltyClampsAggregateToZero() public {
        vm.startPrank(signer);
        oracle.submitScore(aaveV3, 50, 0, 0, 0, 0, traceHash);
        oracle.submitScore(lendle, 50, 0, 0, 0, 0, traceHash);
        oracle.submitScore(methProtocol, 50, 0, 0, 0, 0, traceHash);
        vm.stopPrank();

        IRiskOracle.Action[] memory actions = new IRiskOracle.Action[](3);
        actions[0] = IRiskOracle.Action({protocol: aaveV3, actionType: 0, amount: 1});
        actions[1] = IRiskOracle.Action({protocol: lendle, actionType: 0, amount: 1});
        actions[2] = IRiskOracle.Action({protocol: methProtocol, actionType: 0, amount: 1});

        (uint16 aggregate,,,) = oracle.getRouteScore(actions);
        // mean = 50; penalty = 100; clamped to 0
        assertEq(aggregate, 0);
    }

    // ─── ownership ─────────────────────────────────────────────────────────────

    function test_transferOwnership_ownerCan() public {
        vm.prank(owner);
        oracle.transferOwnership(otherSigner);
        assertEq(oracle.owner(), otherSigner);
    }

    function test_transferOwnership_nonOwnerCannot() public {
        vm.prank(attacker);
        vm.expectRevert(IRiskOracle.NotOwner.selector);
        oracle.transferOwnership(attacker);
    }

    function test_transferOwnership_revertsOnZero() public {
        vm.prank(owner);
        vm.expectRevert(IRiskOracle.ZeroAddress.selector);
        oracle.transferOwnership(address(0));
    }

    function test_transferOwnership_emitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit IRiskOracle.OwnershipTransferred(owner, otherSigner);
        vm.prank(owner);
        oracle.transferOwnership(otherSigner);
    }
}
