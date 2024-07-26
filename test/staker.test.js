require("mocha");
const { expect, assert } = require("chai");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");
const { developmentChains } = require("../helper-config");
const { describe } = require("node:test");

let stakerContract;
let beneficiaryContract;
let deployer, helper01, helper02, helper03;
//let stakingDurationTimestamp = Math.floor((Date.now()) + 864000);//30mintues from current time
let stakingDurationTimestamp = "1753419467000"
console.log("STAKUGGGG ", stakingDurationTimestamp)
let stakeAmountThreshold = ethers.parseEther("1000");
let minStakeAmount = ethers.parseEther("0.01");
!developmentChains.includes(network.config.chainId) ? describe.skip() : describe("Local Tests", function () {
    before(async () => {
        console.log("Initial...");
        const accounts = (await getNamedAccounts());
        deployer = accounts.deployer;
        helper01 = accounts.helper01;
        helper02 = accounts.helper02;
        helper03 = accounts.helper03;
        const p = await deployments.fixture(["all"]);
        const signer = (await ethers.getSigner(deployer));
        stakerContract = (await ethers.getContract("Staker")).connect(signer)

        beneficiaryContract = (await ethers.getContract("BeneficiaryContract")).connect(await ethers.getSigner(helper03))

        const beneficiaryBalance1 = await ethers.provider.getBalance(beneficiaryContract.target);
        console.log("Beneficiary BALANCE::: ", beneficiaryBalance1);
        //console.log(beneficiaryContract)
    })
    describe("Launching Staker", function () {
        let _stakerContract;
        let _beneficiaryContract;
        let _deployer;
        beforeEach(async () => {
            _deployer = (await getNamedAccounts()).deployer;
            const p = await deployments.fixture(["all"]);
            const signer = (await ethers.getSigner(_deployer));
            _stakerContract = (await ethers.getContract("Staker")).connect(signer)

            _beneficiaryContract = await ethers.getContractAt("BeneficiaryContract", signer);
            //console.log(_beneficiaryContract)
        })
        it("should initialize values correctly", async () => {
            await expect(_stakerContract.launchStaking(_beneficiaryContract.target, stakingDurationTimestamp, stakeAmountThreshold, minStakeAmount))
                .to.be.emit(_stakerContract, "Staker_LaunchSuccess");
            const benContractAddress = await _stakerContract.getBeneficiaryContract();
            expect(benContractAddress.toString()).to.be.equal(_beneficiaryContract.target.toString());
        })
        it("should not launch another staking round if already running", async () => {
            await _stakerContract.launchStaking(_beneficiaryContract.target, stakingDurationTimestamp, stakeAmountThreshold, minStakeAmount);
            await expect(_stakerContract.launchStaking(_beneficiaryContract.target, stakingDurationTimestamp, stakeAmountThreshold, minStakeAmount))
                .to.be.revertedWith("Staker state is not closed");
        })
        it("Should revert it stake threshold is 0 or negative value", async () => {
            await expect(_stakerContract.launchStaking(_beneficiaryContract.target, stakingDurationTimestamp, "0", minStakeAmount)).to.be.reverted;
        })
        it("should not able to launch other than Owner(deployer)", async () => {
            const newStaker = await _stakerContract.connect(await ethers.getSigner(helper02));
            await expect(newStaker.launchStaking(_beneficiaryContract.target, stakingDurationTimestamp, stakeAmountThreshold, minStakeAmount)).to.be.revertedWith("Only owner is authorized");
        });
    })


    describe("Staking Before Launch", function () {

        it("Should not able to stake before launch", async () => {
            await expect(stakerContract.stake({ value: ethers.parseEther("10") }))
                .to.be.revertedWith("Staking is not Live");
        })
    })
    describe("Staking", function () {
        let stakeAmount = 100;
        it("Should able to stake after launch", async () => {
            //const { helper01, helper02, helper03 } = await getNamedAccounts();
            await stakerContract.launchStaking(beneficiaryContract.target, stakingDurationTimestamp, stakeAmountThreshold, minStakeAmount);
            const h01ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper01));
            const h02ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper02));
            const h03ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper03));

            await expect(h01ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) }))
                .to.be.emit(h01ConnetedContract, "StakeSuccess").withArgs(helper01, ethers.parseEther(stakeAmount.toString()));
            await expect(h02ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) }))
                .to.be.emit(h02ConnetedContract, "StakeSuccess").withArgs(helper02, ethers.parseEther(stakeAmount.toString()));
            await expect(h03ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) }))
                .to.be.emit(h03ConnetedContract, "StakeSuccess").withArgs(helper03, ethers.parseEther(stakeAmount.toString()));

            const totalFunded = await ethers.provider.getBalance(stakerContract.target);
            expect(totalFunded.toString(), "Total funded check").to.be.equal(ethers.parseEther((stakeAmount * 3).toString()));
        })
    })


    describe("Chainlink", function () {
        it("should not able to stake when processing", async () => {

            //Launching staking
            await stakerContract.launchStaking(beneficiaryContract.target, stakingDurationTimestamp, stakeAmountThreshold, minStakeAmount);
            let stakeAmount = 10;
            //staking
            //const { helper01, helper02, helper03 } = await getNamedAccounts();
            const h01ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper01));
            const h02ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper02));
            const h03ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper03));

            await h01ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });
            await h02ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });
            await h03ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });


            const balance1 = await ethers.provider.getBalance(stakerContract.target)

            const beneficiaryBalance1 = await ethers.provider.getBalance(beneficiaryContract.target);

            //Chainlink keeper manipulation
            await network.provider.send("evm_increaseTime", [(stakingDurationTimestamp + 1).toString()])
            await network.provider.send("evm_mine", []);

            await stakerContract.checkUpkeep(ethers.ZeroHash);
            await stakerContract.performUpkeep(ethers.ZeroHash);

            //unit test
            const balance = await ethers.provider.getBalance(stakerContract.target)
            const beneficiaryBalance = await ethers.provider.getBalance(beneficiaryContract.target);
            await expect(stakerContract.stake({ value: ethers.parseEther("100") })).to.be.revertedWith("Staking is not Live");
        })
        it("Should disperse funds if minStake amount not met", async () => {
            //Launching staking
            await stakerContract.provideGas({ value: ethers.parseEther("10") });
            await stakerContract.launchStaking(beneficiaryContract.target, stakingDurationTimestamp, stakeAmountThreshold, minStakeAmount);
            let stakeAmount = 10;

            const h01ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper01));
            const h02ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper02));
            const h03ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper03));

            await h01ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });
            await h02ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });
            await h03ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });

            await network.provider.send("evm_increaseTime", [(stakingDurationTimestamp + 1).toString()]);
            await network.provider.send("evm_mine", []);

            await stakerContract.checkUpkeep(ethers.ZeroHash);

            await expect(stakerContract.performUpkeep(ethers.ZeroHash)).to.be.emit(stakerContract, "Staker_DisperseFundsSuccess");

            ///Check funders balances
        })
    })

})
