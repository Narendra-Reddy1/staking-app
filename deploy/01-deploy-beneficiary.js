
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    await deploy("BeneficiaryContract", {
        from: deployer,
        log: true,
        args: []
    })
}

module.exports.tags = ["all", "Beneficiary"]