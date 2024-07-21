const { run } = require("hardhat");

const verify = (contractAddress, constructorArgs) => {
    return run("verify:verify", {
        address: contractAddress,
        constructorArgumanets: constructorArgs
    })
};
module.exports = { verify }