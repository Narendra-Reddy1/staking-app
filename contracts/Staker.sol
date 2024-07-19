// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

contract Staker is AutomationCompatible {
    using SafeMath for uint256;

    mapping(address => uint256) private s_funders;
    bool private s_canWithdrawFunds;
    uint256 private s_stakingDuration;
    uint256 private s_minUSDToStake;
    uint256 private s_stakingThreshold;
    address private s_beneficiaryContract;

    bool performUpkeep;
    error InvalidPerformUpKeep();
    event StakeSuccess(address funder, uint256 amount);

    function stake() public payable returns (bool) {
        uint256 balance = s_funders[msg.sender];
        (bool success, uint256 updatedBalance) = balance.tryAdd(msg.value);
        if (success) {
            s_funders[msg.sender] = updatedBalance;
            emit StakeSuccess(msg.sender, updatedBalance);
        }
    }

    function checkUpkeep(
        bytes calldata checkData
    ) external returns (bool upkeepNeeded, bytes memory performData) {
        if (block.timestamp > s_stakingDuration) performUpkeep = true;
    }

    function performUpkeep(bytes calldata performData) external {
        if (!performUpkeep) revert InvalidPerformUpKeep();
        if (address(this).balance >= s_stakingThreshold) {}
    }

    function disperseFundsToFunders() internal {}

    function transferFundsToTargetContract() {}
}
