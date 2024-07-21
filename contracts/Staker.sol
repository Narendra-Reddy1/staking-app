// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {AutomationCompatible} from "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";
import {console} from "hardhat/console.sol";

contract Staker is AutomationCompatible {
    using SafeMath for uint256;
    enum Staker_State {
        Closed, //Staking is closed and ready to run new Staking Round.
        Live, //Currently running
        Processing //Staking duration complete transferring funds
    }
    mapping(address => uint256) private s_funders;
    address[] s_fundersArray;
    mapping(address => bool) private s_uiniqueFundersMap;
    bool private s_canWithdrawFunds;
    uint256 private s_stakingDuration;
    uint256 private s_minUSDToStake;
    uint256 private s_stakingThreshold;
    address private s_beneficiaryContract;
    address private s_owner;
    Staker_State private s_stakerState;
    bool private isUpkeepValid;

    error Staker_InvalidPerformUpKeep();
    error Staker_FundTransferFailed(address funder, uint256 amount);

    event Staker_LaunchSuccess(address beneficiary, uint256 duration);
    event StakeSuccess(address funder, uint256 amount);
    event Staker_DisperseFundsSuccess();
    event Staker_BenefeciaryFundTransferSuccess();

    modifier onlyOwner() {
        require(msg.sender == s_owner, "Only owner is authorized");
        _;
    }

    constructor() {
        s_owner = msg.sender;
        s_stakerState = Staker_State.Closed;
    }

    function launchStaking(
        address beneficiaryAddress,
        uint256 stakingDuration,
        uint256 stakeThreshold
    ) external onlyOwner {
        if (s_stakerState != Staker_State.Closed)
            revert("Staker state is not closed");
        if (
            stakingDuration <= block.timestamp ||
            beneficiaryAddress == address(0) ||
            stakeThreshold <= 0
        ) revert("Invalid inputs");
        s_beneficiaryContract = beneficiaryAddress;
        s_stakingDuration = stakingDuration;
        s_stakingThreshold = stakeThreshold;
        s_stakerState = Staker_State.Live;
        emit Staker_LaunchSuccess(beneficiaryAddress, stakingDuration);
    }

    function stake() public payable returns (bool) {
        if (s_stakerState != Staker_State.Live) revert("Staking is not Live");
        uint256 balance = s_funders[msg.sender];
        (bool success, uint256 updatedBalance) = balance.tryAdd(msg.value);
        if (success) {
            s_funders[msg.sender] = updatedBalance;
            if (!s_uiniqueFundersMap[msg.sender])
                s_fundersArray.push(msg.sender);
            emit StakeSuccess(msg.sender, updatedBalance);
        }
        return success;
    }

    function checkUpkeep(
        bytes calldata
    ) external returns (bool upkeepNeeded, bytes memory) {
        if (
            block.timestamp > s_stakingDuration &&
            s_stakerState == Staker_State.Live
        ) {
            s_stakerState = Staker_State.Processing;
            isUpkeepValid = true;
            upkeepNeeded = isUpkeepValid;
        }
    }

    function performUpkeep(bytes calldata) external {
        if (!isUpkeepValid) {
            revert Staker_InvalidPerformUpKeep();
        }
        if (address(this).balance >= s_stakingThreshold) {
            transferFundsToTargetContract();
        } else {
            disperseFundsToFunders();
        }
    }

    function disperseFundsToFunders() internal {
        uint256 length = s_fundersArray.length;
        for (uint256 i = 0; i < length; i++) {
            uint256 amount = s_funders[s_fundersArray[i]];
            delete s_funders[s_fundersArray[i]];
            (bool success, ) = payable(s_fundersArray[i]).call{value: amount}(
                ""
            );
            if (!success)
                revert Staker_FundTransferFailed(s_fundersArray[i], amount);
        }
        delete s_fundersArray;
        delete s_stakingDuration;
        emit Staker_DisperseFundsSuccess();
    }

    function transferFundsToTargetContract() internal {
        (bool success, ) = payable(s_beneficiaryContract).call{
            value: address(this).balance
        }("");
        if (!success)
            revert Staker_FundTransferFailed(
                s_beneficiaryContract,
                address(this).balance
            );

        uint256 length = s_fundersArray.length;
        for (uint256 i = 0; i < length; i++) {
            delete s_funders[s_fundersArray[i]];
        }
        delete s_fundersArray;
        delete s_stakingDuration;
        emit Staker_BenefeciaryFundTransferSuccess();
    }

    //    function contains(address[] memory arr, address item) private view returns (bool) {
    //        uint256 length = arr.length;
    //        for (uint256 i = 0; i < length; i++) {
    //            if (arr[i] == item) return true;
    //        }
    //        return false;
    //
    //    }

    function getAmountFundedByFunderAddress(
        address key
    ) external view returns (uint256) {
        return s_funders[key];
    }

    function getStakingDuration() external view returns (uint256) {
        return s_stakingDuration;
    }

    function getElapsedStakingTime() external view returns (uint256) {
        return
            s_stakingDuration > block.timestamp
                ? (s_stakingDuration - block.timestamp)
                : uint256(0);
    }

    function getBeneficiaryContract() external view returns (address) {
        return s_beneficiaryContract;
    }

    receive() external payable {}

    fallback() external payable {
        stake();
    }
}
