require("mocha");
const { expect, assert } = require("chai");
const { deployments, ethers, getNamedAccounts, network } = require("hardhat");

let stakerContract;
let beneficiaryContract;
let deployer;
let stakingDurationTimestamp = "1721561114";
let minStakeAmount = ethers.parseEther("10");
before(async () => {
    console.log("Initial...");
    deployer = (await getNamedAccounts()).deployer;
    const { helper03 } = (await getNamedAccounts());
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
        console.log("Launching Staker...");
        _deployer = (await getNamedAccounts()).deployer;
        const p = await deployments.fixture(["all"]);
        const signer = (await ethers.getSigner(_deployer));
        _stakerContract = (await ethers.getContract("Staker")).connect(signer)

        _beneficiaryContract = await ethers.getContractAt("BeneficiaryContract", signer);
        //console.log(_beneficiaryContract)
    })
    it("should initialize values correctly", async () => {
        await expect(_stakerContract.launchStaking(_beneficiaryContract.target, "1721561114", minStakeAmount))
            .to.be.emit(_stakerContract, "Staker_LaunchSuccess");
    })
    it("should not launch another staking round if already running", async () => {
        await _stakerContract.launchStaking(_beneficiaryContract.target, "1721561114", minStakeAmount);
        await expect(_stakerContract.launchStaking(_beneficiaryContract.target, "1721561114", minStakeAmount))
            .to.be.revertedWith("Staker state is not closed");
    })
})


describe("Staking Before Launch", function () {

    it("Should not able to stake before launch", async () => {
        await expect(stakerContract.stake({ value: ethers.parseEther("10") }))
            .to.be.revertedWith("Staking is not Live");
    })
})
describe("Staking", function () {
    let stakeAmount = 100;
    before(async () => {
        console.log("Staking...");
        await stakerContract.launchStaking(beneficiaryContract.target, stakingDurationTimestamp, minStakeAmount);
    })
    it("Should able to stake after launch", async () => {
        const { helper01, helper02, helper03 } = await getNamedAccounts();
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
        await stakerContract.launchStaking(beneficiaryContract.target, stakingDurationTimestamp, minStakeAmount);
        let stakeAmount = 100;
        //staking
        const { helper01, helper02, helper03 } = await getNamedAccounts();
        const h01ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper01));
        const h02ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper02));
        const h03ConnetedContract = await stakerContract.connect(await ethers.getSigner(helper03));

        await h01ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });
        await h02ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });
        await h03ConnetedContract.stake({ value: ethers.parseEther(stakeAmount.toString()) });

        console.log("elapsed:: ", await stakerContract.getElapsedStakingTime());
        const balance1 = await ethers.provider.getBalance(stakerContract.target)
        console.log("BALANCE before::: ", balance1);
        const beneficiaryBalance1 = await ethers.provider.getBalance(beneficiaryContract.target);
        console.log("Beneficiary BALANCE::: ", beneficiaryBalance1);
        //Chainlink keeper manipulation
        await network.provider.send("evm_increaseTime", [(stakingDurationTimestamp + 1).toString()])
        await network.provider.send("evm_mine", []);
        console.log("duration:: ", await stakerContract.getStakingDuration());
        console.log("elapsed:: ", await stakerContract.getElapsedStakingTime());
        await stakerContract.checkUpkeep(ethers.ZeroHash);
        await stakerContract.performUpkeep(ethers.ZeroHash);

        //unit test
        const balance = await ethers.provider.getBalance(stakerContract.target)
        const beneficiaryBalance = await ethers.provider.getBalance(beneficiaryContract.target);
        console.log("Beneficiary BALANCE::: ", beneficiaryBalance);
        console.log("BALANCE after::: ", balance);
        await expect(stakerContract.stake({ value: ethers.parseEther("100") })).to.be.revertedWith("Staking is not Live");


    })


})