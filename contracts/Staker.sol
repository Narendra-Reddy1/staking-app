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
    bool private isUpkeepValid;
    Staker_State private s_stakerState;
    address private s_owner;
    address private s_beneficiaryContract;

    uint256 private s_stakingDuration;
    uint256 private s_minAmountToStake;
    uint256 private s_stakingThreshold;

    address[] s_fundersArray;
    mapping(address => uint256) private s_funders;
    mapping(address => bool) private s_uiniqueFundersMap;

    error Staker_InvalidPerformUpKeep();
    error Staker_InvalidLaunchInputs(
        address beneficiary,
        uint256 duration,
        uint256 stakeThreshold
    );
    error Staker_StakeMinAmountAtleast(uint256 received, uint256 required);
    //error Staker_FundTransferFailed(address funder, uint256 amount);
    error Staker_BeneficiaryFundTransferFailed(address funder, uint256 amount);

    error Staker_TransferFailed(address funder, uint256 amount);

    event Staker_FundTransferFailed(address funder, uint256 amount);
    event Staker_LaunchSuccess(address beneficiary, uint256 duration);
    event StakeSuccess(address funder, uint256 amount);
    event Staker_DisperseFundsSuccess();
    event Staker_BenefeciaryFundTransferSuccess();

    modifier onlyOwner() {
        require(msg.sender == s_owner, "Only owner is authorized");
        _;
    }

    modifier allowedToWithdraw() {
        require(block.timestamp > s_stakingDuration, "Not allowed to withdraw");
        _;
    }

    constructor() {
        s_owner = msg.sender;
        s_stakerState = Staker_State.Closed;
    }

    function launchStaking(
        address beneficiaryAddress,
        uint256 stakingDuration,
        uint256 stakeThreshold,
        uint256 minAmountToStake
    ) external onlyOwner {
        if (s_stakerState != Staker_State.Closed)
            revert("Staker state is not closed");
        if (stakingDuration <= block.timestamp || beneficiaryAddress == address(0) || stakeThreshold <= 0)
            revert Staker_InvalidLaunchInputs(
                beneficiaryAddress,
                stakingDuration,
                stakeThreshold
            );

        s_minAmountToStake = minAmountToStake;
        s_beneficiaryContract = beneficiaryAddress;
        s_stakingDuration = stakingDuration;
        s_stakingThreshold = stakeThreshold;
        s_stakerState = Staker_State.Live;
        emit Staker_LaunchSuccess(beneficiaryAddress, stakingDuration);
    }

    function stake() public payable returns (bool) {
        if (s_stakerState != Staker_State.Live) revert("Staking is not Live");
        if (s_minAmountToStake > msg.value) revert Staker_StakeMinAmountAtleast(msg.value, s_minAmountToStake);
        uint256 balance = s_funders[msg.sender];
        (bool success, uint256 updatedBalance) = balance.tryAdd(msg.value);
        if (success) {
            s_funders[msg.sender] = updatedBalance;
            if (!s_uiniqueFundersMap[msg.sender]) {
                s_fundersArray.push(msg.sender);
                s_uiniqueFundersMap[msg.sender] = true;
            }
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
            console.logString("Transferring...");
            transferFundsToTargetContract();
        } else {
            console.logString("Dispersing...");
            disperseFundsToFunders();
        }
    }

    function disperseFundsToFunders() internal {
        uint256 length = s_fundersArray.length;
        console.logUint(address(this).balance);
        for (uint256 i = 0; i < length; i++) {
            address funder = s_fundersArray[i];
            uint256 amount = s_funders[funder];

            s_uiniqueFundersMap[funder] = false;
            s_funders[funder] = 0;
            (bool success,) = payable(s_fundersArray[i]).call{value: amount}(
                ""
            );
            console.logString("--------------------------------------------");
            console.logAddress(s_fundersArray[i]);
            console.logUint(amount);
            console.logUint(funder.balance);
            if (!success) {
                // If transfer fails, restore the state
                s_uiniqueFundersMap[funder] = true;
                s_funders[funder] = amount;
                // Emit an event for the failed transfer
                emit Staker_FundTransferFailed(funder, amount);
                // Continue with the next funder
                continue;
            }
            console.logUint(funder.balance);
            console.logString("--------------------------------------------");
            // if (!success)
            //     revert Staker_FundTransferFailed(s_fundersArray[i], amount);
            /* 
            What happens if a transaction fails after some successfull transactions?
            It is not possible to revert the transferred funds and this contract will get reverted and 
            stays in incorrect state......
             */
        }
        delete s_fundersArray;
        delete s_stakingDuration;
        delete s_stakingThreshold;
        s_stakerState = Staker_State.Closed;
        emit Staker_DisperseFundsSuccess();
    }

    function provideGas() payable external {

    }

    function transferFundsToTargetContract() internal {
        (bool success,) = payable(s_beneficiaryContract).call{
                value: address(this).balance
            }("");
        if (!success)
            revert Staker_BeneficiaryFundTransferFailed(
                s_beneficiaryContract,
                address(this).balance
            );

        uint256 length = s_fundersArray.length;

        /* 
            What if there the array has a million users?
            Will the transaction run out of gas?
         */
        for (uint256 i = 0; i < length; i++) {
            delete s_funders[s_fundersArray[i]];
            delete s_uiniqueFundersMap[msg.sender];
        }
        delete s_fundersArray;
        delete s_stakingDuration;
        delete s_stakingThreshold;
        s_stakerState = Staker_State.Closed;
        emit Staker_BenefeciaryFundTransferSuccess();
    }

    function withdrawStakedAmount(address funder) external allowedToWithdraw {
        if (s_uiniqueFundersMap[funder]) {
            uint256 amount = s_funders[funder];
            delete s_funders[funder];
            (bool success,) = payable(funder).call{value: amount}("");
            if (!success) revert Staker_TransferFailed(funder, amount);
        }
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

    function getRemainingStakingTime() external view returns (uint256) {
        return
            s_stakingDuration > block.timestamp
                ? (s_stakingDuration - block.timestamp)
                : uint256(0);
    }

    function getBeneficiaryContract() external view returns (address) {
        return s_beneficiaryContract;
    }

    function getStakingThreshold() external view returns (uint256) {
        return s_stakingThreshold;
    }

    function getBal() external view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        stake();
    }
}
