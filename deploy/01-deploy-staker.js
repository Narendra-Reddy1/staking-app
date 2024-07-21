const { network } = require("hardhat");
const { developmentChains } = require("../helper-config");
const { verify } = require("../utils/verify");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    const stakerContract = await deploy("Staker", {
        from: deployer,
        log: true,
        args: []
    });
    if (!developmentChains.includes(network.config.chainId))
        await verify(stakerContract.address, [])
}

module.exports.tags = ["all", "Staker"]