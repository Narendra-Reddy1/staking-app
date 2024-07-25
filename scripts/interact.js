//0x9E2bFd4b9Db2D8Eb51361865eaC225Acd351A9bE

const { EtherscanProvider } = require("ethers");
const { ethers } = require("hardhat")

const address = "0x9E2bFd4b9Db2D8Eb51361865eaC225Acd351A9bE";
const abi = [{ "inputs": [], "stateMutability": "nonpayable", "type": "constructor" }, { "inputs": [], "name": "OnlySimulatedBackend", "type": "error" }, { "inputs": [{ "internalType": "address", "name": "funder", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "Staker_FundTransferFailed", "type": "error" }, { "inputs": [], "name": "Staker_InvalidPerformUpKeep", "type": "error" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "funder", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "StakeSuccess", "type": "event" }, { "anonymous": false, "inputs": [], "name": "Staker_BenefeciaryFundTransferSuccess", "type": "event" }, { "anonymous": false, "inputs": [], "name": "Staker_DisperseFundsSuccess", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "address", "name": "beneficiary", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "duration", "type": "uint256" }], "name": "Staker_LaunchSuccess", "type": "event" }, { "stateMutability": "payable", "type": "fallback" }, { "inputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }], "name": "checkUpkeep", "outputs": [{ "internalType": "bool", "name": "upkeepNeeded", "type": "bool" }, { "internalType": "bytes", "name": "", "type": "bytes" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "key", "type": "address" }], "name": "getAmountFundedByFunderAddress", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getBeneficiaryContract", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getElapsedStakingTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getStakingDuration", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "beneficiaryAddress", "type": "address" }, { "internalType": "uint256", "name": "stakingDuration", "type": "uint256" }, { "internalType": "uint256", "name": "stakeThreshold", "type": "uint256" }], "name": "launchStaking", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes", "name": "", "type": "bytes" }], "name": "performUpkeep", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "stake", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "payable", "type": "function" }, { "stateMutability": "payable", "type": "receive" }]
async function main() {

    const time = /* 30*60*1000
     */ 120000;
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL, 11155111);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const wallet2 = new ethers.Wallet(process.env.PRIVATE_KEY_2, provider);
    const stakerContract = new ethers.Contract(address, abi, wallet);


    const hcContract = stakerContract.connect(wallet2);
    await stakerContract.launchStaking("0x8925459e25c3f757f59A5969076017D5D98D4C90", (Date.now() + time).toString(), ethers.parseEther("0.1"))
    console.log("before wallet address", await ethers.provider.getBalance(wallet2.address));
    await hcContract.stake({ value: ethers.parseEther("0.1") });
    console.log("Remaining time: ", await stakerContract.getElapsedStakingTime());
    console.log("contract balance: ", await ethers.provider.getBalance(address));
    setInterval(async () => {
        await stakerContract.checkUpkeep(ethers.ZeroHash);
        console.log("Remaining time: ", await stakerContract.getElapsedStakingTime());
    }, 5000);
    // const keepWaiting = new Promise((resolve, reject) => {
    //     setTimeout(async () => {
    //         try {
    //             await stakerContract.checkUpkeep(ethers.ZeroHash);
    //             await stakerContract.performUpkeep(ethers.ZeroHash);
    //             console.log("After wallet address", await ethers.provider.getBalance(wallet2.address));
    //             resolve();
    //         }
    //         catch (e) {
    //             console.log(e);
    //             reject();
    //         }
    //     }, time);
    // })
    await keepWaiting;
}

main().catch(err => {
    console.log(err);
})

