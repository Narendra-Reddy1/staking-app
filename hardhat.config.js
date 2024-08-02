require("dotenv").config();
require("@nomiclabs/hardhat-ethers")
require("hardhat-deploy");
require("hardhat-deploy-ethers")
require("@nomicfoundation/hardhat-chai-matchers")
require("@nomicfoundation/hardhat-verify")
//require("hardhat-gas-reporter")
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_2 = process.env.PRIVATE_KEY_2;
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const COIN_MARKET_CAP_API_KEY = process.env.COIN_MARKET_CAP_API_KEY;
const ETHER_SCAN_API_KEY = process.env.ETHER_SCAN_API_KEY;
module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        localhost: {
            chainId: 31337
        },
        sepolia: {
            chainId: 11155111,
            url: SEPOLIA_RPC_URL,
            accounts: [PRIVATE_KEY, PRIVATE_KEY_2],
        }
    },
    etherscan: {
        apiKey: {
            sepolia: ETHER_SCAN_API_KEY
        }
    },
    gasreporter: {
        enabled: false,
        noColors: true,
        currency: "USD",
        coinmarketcap: COIN_MARKET_CAP_API_KEY,
        outputFile: "gas-reporter.txt"

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
        },
        helper03: {
            31337: 3
        }
    },
    solidity: {
        compilers:
            [
                {
                    version: "0.8.24",
                },
                {
                    version: "0.8.0"
                }
            ]
    }
};