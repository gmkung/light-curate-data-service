"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemStatus = void 0;
exports.connectWallet = connectWallet;
exports.getCurrentAccount = getCurrentAccount;
exports.getChallengePeriodDurationInDays = getChallengePeriodDurationInDays;
exports.getSubmissionDepositAmount = getSubmissionDepositAmount;
exports.getSubmissionChallengeDepositAmount = getSubmissionChallengeDepositAmount;
exports.getRemovalDepositAmount = getRemovalDepositAmount;
exports.getRemovalChallengeDepositAmount = getRemovalChallengeDepositAmount;
exports.submitToRegistry = submitToRegistry;
exports.removeItem = removeItem;
exports.challengeRequest = challengeRequest;
exports.formatWalletAddress = formatWalletAddress;
exports.handleWeb3Error = handleWeb3Error;
exports.switchToMainnet = switchToMainnet;
const sonner_1 = require("sonner");
const LightGeneralizedTCR_ABI_json_1 = __importDefault(require("./references/LightCurate/LightGeneralizedTCR_ABI.json"));
const KlerosLiquid_ABI_json_1 = __importDefault(require("./references/KlerosLiquid/KlerosLiquid_ABI.json"));
const CONTRACT_ADDRESS = "0xda03509Bb770061A61615AD8Fc8e1858520eBd86"; // Kleros Curate TCR Address
// Add explicit status enum to match the smart contract
var ItemStatus;
(function (ItemStatus) {
    ItemStatus[ItemStatus["Absent"] = 0] = "Absent";
    ItemStatus[ItemStatus["Registered"] = 1] = "Registered";
    ItemStatus[ItemStatus["RegistrationRequested"] = 2] = "RegistrationRequested";
    ItemStatus[ItemStatus["ClearingRequested"] = 3] = "ClearingRequested";
})(ItemStatus || (exports.ItemStatus = ItemStatus = {}));
async function connectWallet() {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
    }
    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });
        return accounts[0];
    }
    catch (error) {
        console.error("Error connecting wallet:", error);
        throw new Error(`Failed to connect wallet: ${error.message}`);
    }
}
async function getCurrentAccount() {
    if (!window.ethereum)
        return null;
    try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        return accounts[0] || null;
    }
    catch (error) {
        console.error("Error getting current account:", error);
        return null;
    }
}
async function getChallengePeriodDurationInDays() {
    try {
        // Create Web3 instance
        const Web3 = (await Promise.resolve().then(() => __importStar(require("web3")))).default;
        const web3 = new Web3(window.ethereum ||
            "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
        // Create TCR contract instance
        const tcrContract = new web3.eth.Contract(LightGeneralizedTCR_ABI_json_1.default, CONTRACT_ADDRESS);
        // Get challengePeriodDuration in seconds
        const challengePeriodInSeconds = await tcrContract.methods
            .challengePeriodDuration()
            .call();
        // Convert seconds to days (86400 seconds in a day)
        const challengePeriodInDays = Math.ceil(Number(challengePeriodInSeconds) / 86400);
        return challengePeriodInDays;
    }
    catch (error) {
        console.error("Error getting challenge period duration:", error);
        throw new Error("Failed to retrieve challenge period duration");
    }
}
// Create a helper function to get arbitration cost
async function getArbitrationCost() {
    try {
        const Web3 = (await Promise.resolve().then(() => __importStar(require("web3")))).default;
        const web3 = new Web3(window.ethereum ||
            "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
        // Create TCR contract instance
        const tcrContract = new web3.eth.Contract(LightGeneralizedTCR_ABI_json_1.default, CONTRACT_ADDRESS);
        // Get arbitrator address and extra data
        const arbitratorAddress = await tcrContract.methods.arbitrator().call();
        const arbitratorExtraData = await tcrContract.methods
            .arbitratorExtraData()
            .call();
        console.log("Arbitrator address:", arbitratorAddress);
        console.log("Arbitrator extra data:", arbitratorExtraData);
        // Create Kleros Liquid arbitrator contract instance
        if (!arbitratorAddress || typeof arbitratorAddress !== "string") {
            throw new Error("Invalid arbitrator address");
        }
        const arbitratorContract = new web3.eth.Contract(KlerosLiquid_ABI_json_1.default, arbitratorAddress);
        // Get actual arbitration cost
        const arbitrationCostWei = await arbitratorContract.methods
            .arbitrationCost(arbitratorExtraData)
            .call();
        if (!arbitrationCostWei) {
            throw new Error("Failed to retrieve arbitration cost");
        }
        // Convert to ETH for display
        const arbitrationCost = web3.utils.fromWei(arbitrationCostWei.toString(), "ether");
        return {
            arbitrationCost,
            arbitrationCostWei: arbitrationCostWei.toString(),
            arbitrator: arbitratorContract,
        };
    }
    catch (error) {
        console.error("Error getting arbitration cost:", error);
        throw new Error("Failed to retrieve arbitration cost");
    }
}
// Generic function to calculate deposit amount
async function calculateDepositAmount(baseDepositMethod, baseDepositName) {
    try {
        const Web3 = (await Promise.resolve().then(() => __importStar(require("web3")))).default;
        const web3 = new Web3(window.ethereum ||
            "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
        // Get challenge period duration
        const challengePeriodDays = await getChallengePeriodDurationInDays();
        // Create TCR contract instance
        const tcrContract = new web3.eth.Contract(LightGeneralizedTCR_ABI_json_1.default, CONTRACT_ADDRESS);
        // Get base deposit
        const baseDepositResult = await tcrContract.methods[baseDepositMethod]().call();
        const baseDeposit = baseDepositResult ? baseDepositResult.toString() : "0";
        // Get arbitration cost
        const { arbitrationCost, arbitrationCostWei } = await getArbitrationCost();
        // Calculate total deposit
        const totalDepositWei = BigInt(baseDeposit) + BigInt(arbitrationCostWei);
        // Convert to ETH for display
        const baseDepositEth = web3.utils.fromWei(baseDeposit, "ether");
        const depositAmountEth = web3.utils.fromWei(totalDepositWei.toString(), "ether");
        console.log(`${baseDepositName} calculation breakdown:`, {
            baseDeposit: baseDepositEth,
            arbitrationCost,
            total: depositAmountEth,
        });
        return {
            depositAmount: depositAmountEth,
            depositInWei: totalDepositWei.toString(),
            breakdown: {
                baseDeposit: baseDepositEth,
                arbitrationCost,
                total: depositAmountEth,
            },
            challengePeriodDays,
        };
    }
    catch (error) {
        console.error(`Error getting ${baseDepositName} amount:`, error);
        throw new Error(`Failed to calculate required ${baseDepositName} amount: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}
// Simplified wrapper functions
async function getSubmissionDepositAmount() {
    return calculateDepositAmount("submissionBaseDeposit", "submission deposit");
}
async function getSubmissionChallengeDepositAmount() {
    return calculateDepositAmount("submissionChallengeBaseDeposit", "submission challenge deposit");
}
async function getRemovalDepositAmount() {
    return calculateDepositAmount("removalBaseDeposit", "removal deposit");
}
async function getRemovalChallengeDepositAmount() {
    return calculateDepositAmount("removalChallengeBaseDeposit", "removal challenge deposit");
}
async function submitToRegistry(ipfsPath) {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
    }
    // Ensure ipfsPath starts with "/ipfs/"
    const formattedPath = ipfsPath.startsWith("/ipfs/")
        ? ipfsPath
        : `/ipfs/${ipfsPath}`;
    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });
        const from = accounts[0];
        // Create Web3 instance
        const Web3 = (await Promise.resolve().then(() => __importStar(require("web3")))).default;
        const web3 = new Web3(window.ethereum);
        // Get required deposit amount
        const { depositInWei } = await getSubmissionDepositAmount();
        // Create contract instance
        const contract = new web3.eth.Contract(LightGeneralizedTCR_ABI_json_1.default, CONTRACT_ADDRESS);
        // Estimate gas and get current gas price
        const gasEstimate = await contract.methods
            .addItem(formattedPath)
            .estimateGas({
            from,
            value: depositInWei,
        });
        const gasPrice = await web3.eth.getGasPrice();
        // Calculate gas with 20% buffer and convert to string
        const gasBigInt = BigInt(gasEstimate);
        const gasWithBuffer = ((gasBigInt * BigInt(120)) / BigInt(100)).toString();
        // Convert gasPrice to string
        const gasPriceString = gasPrice.toString();
        // Submit transaction with the dynamic deposit amount
        const txReceipt = await contract.methods.addItem(formattedPath).send({
            from,
            gas: gasWithBuffer,
            gasPrice: gasPriceString,
            value: depositInWei,
        });
        return txReceipt.transactionHash;
    }
    catch (error) {
        console.error("Error submitting to registry:", error);
        // Format error for user
        let errorMessage = "Failed to submit to registry";
        if (error.code === 4001) {
            errorMessage = "Transaction rejected by user";
        }
        else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}
async function removeItem(itemID, evidence = "") {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
    }
    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });
        const from = accounts[0];
        // Create Web3 instance
        const Web3 = (await Promise.resolve().then(() => __importStar(require("web3")))).default;
        const web3 = new Web3(window.ethereum);
        // Get required deposit amount
        const { depositInWei } = await getRemovalDepositAmount();
        // Create contract instance
        const contract = new web3.eth.Contract(LightGeneralizedTCR_ABI_json_1.default, CONTRACT_ADDRESS);
        // Format evidence URL - ensure it starts with "/ipfs/"
        const formattedEvidence = evidence
            ? evidence.startsWith("/ipfs/")
                ? evidence
                : `/ipfs/${evidence}`
            : "";
        // Estimate gas and get current gas price
        const gasEstimate = await contract.methods
            .removeItem(itemID, formattedEvidence)
            .estimateGas({
            from,
            value: depositInWei,
        });
        const gasPrice = await web3.eth.getGasPrice();
        // Calculate gas with 20% buffer and convert to string
        const gasBigInt = BigInt(gasEstimate);
        const gasWithBuffer = ((gasBigInt * BigInt(120)) / BigInt(100)).toString();
        // Convert gasPrice to string
        const gasPriceString = gasPrice.toString();
        // Submit transaction with the dynamic deposit amount
        const txReceipt = await contract.methods
            .removeItem(itemID, formattedEvidence)
            .send({
            from,
            gas: gasWithBuffer,
            gasPrice: gasPriceString,
            value: depositInWei,
        });
        return txReceipt.transactionHash;
    }
    catch (error) {
        console.error("Error removing item from registry:", error);
        // Format error for user
        let errorMessage = "Failed to remove item from registry";
        if (error.code === 4001) {
            errorMessage = "Transaction rejected by user";
        }
        else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}
// Update challengeRequest to use the enum
async function challengeRequest(itemID, evidence = "") {
    if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
    }
    try {
        const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
        });
        const from = accounts[0];
        // Create Web3 instance
        const Web3 = (await Promise.resolve().then(() => __importStar(require("web3")))).default;
        const web3 = new Web3(window.ethereum);
        // Create contract instance
        const contract = new web3.eth.Contract(LightGeneralizedTCR_ABI_json_1.default, CONTRACT_ADDRESS);
        // Get the item info to determine its status
        const itemResult = (await contract.methods.items(itemID).call());
        if (!itemResult) {
            throw new Error("Failed to retrieve item information");
        }
        // Convert status to number and validate
        const itemStatus = Number(itemResult.status);
        if (isNaN(itemStatus)) {
            throw new Error("Failed to retrieve valid item status");
        }
        // Use the enum for clearer status checks
        if (itemStatus !== ItemStatus.RegistrationRequested &&
            itemStatus !== ItemStatus.ClearingRequested) {
            throw new Error("Item not in a challengeable state");
        }
        // Determine which deposit to use based on item status
        let depositInfo;
        if (itemStatus === ItemStatus.RegistrationRequested) {
            depositInfo = await getSubmissionChallengeDepositAmount();
        }
        else {
            depositInfo = await getRemovalChallengeDepositAmount();
        }
        // Format evidence URL
        const formattedEvidence = evidence
            ? evidence.startsWith("/ipfs/")
                ? evidence
                : `/ipfs/${evidence}`
            : "";
        // Estimate gas and get current gas price
        const gasEstimate = await contract.methods
            .challengeRequest(itemID, formattedEvidence)
            .estimateGas({
            from,
            value: depositInfo.depositInWei,
        });
        const gasPrice = await web3.eth.getGasPrice();
        // Calculate gas with 20% buffer
        const gasBigInt = BigInt(gasEstimate);
        const gasWithBuffer = ((gasBigInt * BigInt(120)) / BigInt(100)).toString();
        // Submit challenge transaction
        const txReceipt = await contract.methods
            .challengeRequest(itemID, formattedEvidence)
            .send({
            from,
            gas: gasWithBuffer,
            gasPrice: gasPrice.toString(),
            value: depositInfo.depositInWei,
        });
        return txReceipt.transactionHash;
    }
    catch (error) {
        console.error("Error challenging request:", error);
        // Format error for user
        let errorMessage = "Failed to challenge request";
        if (error.code === 4001) {
            errorMessage = "Transaction rejected by user";
        }
        else if (error.message) {
            errorMessage = `Error: ${error.message}`;
        }
        throw new Error(errorMessage);
    }
}
function formatWalletAddress(address) {
    if (!address)
        return "Not connected";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
function handleWeb3Error(error) {
    let message = "An unknown error occurred";
    if (typeof error === "string") {
        message = error;
    }
    else if (error === null || error === void 0 ? void 0 : error.message) {
        message = error.message.replace("MetaMask Tx Signature: ", "");
        // Clean up common Web3 errors
        if (message.includes("User denied")) {
            message = "Transaction was rejected";
        }
        else if (message.includes("insufficient funds")) {
            message = "Insufficient funds for transaction";
        }
    }
    // Limit message length
    if (message.length > 100) {
        message = message.substring(0, 100) + "...";
    }
    return message;
}
async function switchToMainnet() {
    if (!window.ethereum)
        return false;
    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x1" }], // Ethereum Mainnet
        });
        return true;
    }
    catch (error) {
        console.error("Error switching network:", error);
        sonner_1.toast.error("Please switch to Ethereum Mainnet");
        return false;
    }
}
