// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {RiskOracle} from "../src/RiskOracle.sol";

/// @notice Deploy the RiskOracle to Mantle (Mainnet or Sepolia).
/// @dev Usage:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url $MANTLE_SEPOLIA_RPC_URL \
///     --private-key $DEPLOYER_PRIVATE_KEY \
///     --broadcast \
///     --verify
contract Deploy is Script {
    function run() external returns (RiskOracle oracle) {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("deployer:", deployer);
        console2.log("chain id:", block.chainid);

        vm.startBroadcast(pk);
        oracle = new RiskOracle(deployer);
        vm.stopBroadcast();

        console2.log("RiskOracle:", address(oracle));
        console2.log("owner:    ", oracle.owner());
        return oracle;
    }
}
