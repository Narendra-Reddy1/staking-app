require("dotenv").config();
require("@nomiclabs/hardhat-ethers")
require("hardhat-deploy");
require("mocha")
require("hardhat-deploy-ethers")
require("@nomicfoundation/hardhat-chai-matchers")
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        localhost: {
            chainId: 31337,
            url: "http://127.0.0.1:8545/",
        },
        sepolia: {
            chainId: 1115511,
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY]
        }

    },
    namedAccounts: {
        deployer: {
            default: 0,
            11155111: 0,
        },
        helper01: {
            31337: 1
        },
        helper02: {
            31337: 2
        }
    },
    solidity: "0.8.24",
};