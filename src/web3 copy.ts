
import { toast } from "sonner";
import LCURATE_ABI from "./references/LightCurate/LightGeneralizedTCR_ABI.json";
import KLEROS_LIQUID_ABI from "./references/KlerosLiquid/KlerosLiquid_ABI.json";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const CONTRACT_ADDRESS = "0xda03509Bb770061A61615AD8Fc8e1858520eBd86"; // Kleros Curate TCR Address

interface Item {
  status: string | number;
  // Add other properties if needed
}

// Add explicit status enum to match the smart contract
export enum ItemStatus {
  Absent = 0,
  Registered = 1,
  RegistrationRequested = 2,
  ClearingRequested = 3,
}

// Define a consistent interface for deposit information
export interface DepositInfo {
  depositAmount: string;
  depositInWei: string;
  breakdown: {
    baseDeposit: string;
    arbitrationCost: string;
    total: string;
  };
  challengePeriodDays: number;
}

export async function connectWallet(): Promise<string> {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install MetaMask to continue."
    );
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    return accounts[0];
  } catch (error: any) {
    console.error("Error connecting wallet:", error);
    throw new Error(`Failed to connect wallet: ${error.message}`);
  }
}

export async function getCurrentAccount(): Promise<string | null> {
  if (!window.ethereum) return null;

  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    return accounts[0] || null;
  } catch (error) {
    console.error("Error getting current account:", error);
    return null;
  }
}

export async function getChallengePeriodDurationInDays(): Promise<number> {
  try {
    // Create Web3 instance
    const Web3 = (await import("web3")).default;
    const web3 = new Web3(
      window.ethereum ||
        "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
    );

    // Create TCR contract instance
    const tcrContract = new web3.eth.Contract(
      LCURATE_ABI as any,
      CONTRACT_ADDRESS
    );

    // Get challengePeriodDuration in seconds
    const challengePeriodInSeconds = await tcrContract.methods
      .challengePeriodDuration()
      .call();

    // Convert seconds to days (86400 seconds in a day)
    const challengePeriodInDays = Math.ceil(
      Number(challengePeriodInSeconds) / 86400
    );

    return challengePeriodInDays;
  } catch (error) {
    console.error("Error getting challenge period duration:", error);
    throw new Error("Failed to retrieve challenge period duration");
  }
}

// Create a helper function to get arbitration cost
async function getArbitrationCost(): Promise<{
  arbitrationCost: string;
  arbitrationCostWei: string;
  arbitrator: any;
}> {
  try {
    const Web3 = (await import("web3")).default;
    const web3 = new Web3(
      window.ethereum ||
        "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
    );

    // Create TCR contract instance
    const tcrContract = new web3.eth.Contract(
      LCURATE_ABI as any,
      CONTRACT_ADDRESS
    );

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

    const arbitratorContract = new web3.eth.Contract(
      KLEROS_LIQUID_ABI as any,
      arbitratorAddress
    );

    // Get actual arbitration cost
    const arbitrationCostWei = await arbitratorContract.methods
      .arbitrationCost(arbitratorExtraData)
      .call();
    if (!arbitrationCostWei) {
      throw new Error("Failed to retrieve arbitration cost");
    }

    // Convert to ETH for display
    const arbitrationCost = web3.utils.fromWei(
      arbitrationCostWei.toString(),
      "ether"
    );

    return {
      arbitrationCost,
      arbitrationCostWei: arbitrationCostWei.toString(),
      arbitrator: arbitratorContract,
    };
  } catch (error) {
    console.error("Error getting arbitration cost:", error);
    throw new Error("Failed to retrieve arbitration cost");
  }
}

// Generic function to calculate deposit amount
async function calculateDepositAmount(
  baseDepositMethod: string,
  baseDepositName: string
): Promise<DepositInfo> {
  try {
    const Web3 = (await import("web3")).default;
    const web3 = new Web3(
      window.ethereum ||
        "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161"
    );

    // Get challenge period duration
    const challengePeriodDays = await getChallengePeriodDurationInDays();

    // Create TCR contract instance
    const tcrContract = new web3.eth.Contract(
      LCURATE_ABI as any,
      CONTRACT_ADDRESS
    );

    // Get base deposit
    const baseDepositResult =
      await tcrContract.methods[baseDepositMethod]().call();
    const baseDeposit = baseDepositResult ? baseDepositResult.toString() : "0";

    // Get arbitration cost
    const { arbitrationCost, arbitrationCostWei } = await getArbitrationCost();

    // Calculate total deposit
    const totalDepositWei = BigInt(baseDeposit) + BigInt(arbitrationCostWei);

    // Convert to ETH for display
    const baseDepositEth = web3.utils.fromWei(baseDeposit, "ether");
    const depositAmountEth = web3.utils.fromWei(
      totalDepositWei.toString(),
      "ether"
    );

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
  } catch (error) {
    console.error(`Error getting ${baseDepositName} amount:`, error);
    throw new Error(
      `Failed to calculate required ${baseDepositName} amount: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// Simplified wrapper functions
export async function getSubmissionDepositAmount(): Promise<DepositInfo> {
  return calculateDepositAmount("submissionBaseDeposit", "submission deposit");
}

export async function getSubmissionChallengeDepositAmount(): Promise<DepositInfo> {
  return calculateDepositAmount(
    "submissionChallengeBaseDeposit",
    "submission challenge deposit"
  );
}

export async function getRemovalDepositAmount(): Promise<DepositInfo> {
  return calculateDepositAmount("removalBaseDeposit", "removal deposit");
}

export async function getRemovalChallengeDepositAmount(): Promise<DepositInfo> {
  return calculateDepositAmount(
    "removalChallengeBaseDeposit",
    "removal challenge deposit"
  );
}

export async function submitToRegistry(ipfsPath: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install MetaMask to continue."
    );
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
    const Web3 = (await import("web3")).default;
    const web3 = new Web3(window.ethereum);

    // Get required deposit amount
    const { depositInWei } = await getSubmissionDepositAmount();

    // Create contract instance
    const contract = new web3.eth.Contract(
      LCURATE_ABI as any,
      CONTRACT_ADDRESS
    );

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
  } catch (error: any) {
    console.error("Error submitting to registry:", error);

    // Format error for user
    let errorMessage = "Failed to submit to registry";

    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

export async function removeItem(
  itemID: string,
  evidence: string = ""
): Promise<string> {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install MetaMask to continue."
    );
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const from = accounts[0];

    // Create Web3 instance
    const Web3 = (await import("web3")).default;
    const web3 = new Web3(window.ethereum);

    // Get required deposit amount
    const { depositInWei } = await getRemovalDepositAmount();

    // Create contract instance
    const contract = new web3.eth.Contract(
      LCURATE_ABI as any,
      CONTRACT_ADDRESS
    );

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
  } catch (error: any) {
    console.error("Error removing item from registry:", error);

    // Format error for user
    let errorMessage = "Failed to remove item from registry";

    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

// Update challengeRequest to use the enum
export async function challengeRequest(
  itemID: string,
  evidence: string = ""
): Promise<string> {
  if (!window.ethereum) {
    throw new Error(
      "MetaMask is not installed. Please install MetaMask to continue."
    );
  }

  try {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    const from = accounts[0];

    // Create Web3 instance
    const Web3 = (await import("web3")).default;
    const web3 = new Web3(window.ethereum);

    // Create contract instance
    const contract = new web3.eth.Contract(
      LCURATE_ABI as any,
      CONTRACT_ADDRESS
    );

    // Get the item info to determine its status
    const itemResult = (await contract.methods.items(itemID).call()) as Item;

    if (!itemResult) {
      throw new Error("Failed to retrieve item information");
    }

    // Convert status to number and validate
    const itemStatus = Number(itemResult.status);

    if (isNaN(itemStatus)) {
      throw new Error("Failed to retrieve valid item status");
    }

    // Use the enum for clearer status checks
    if (
      itemStatus !== ItemStatus.RegistrationRequested &&
      itemStatus !== ItemStatus.ClearingRequested
    ) {
      throw new Error("Item not in a challengeable state");
    }

    // Determine which deposit to use based on item status
    let depositInfo;
    if (itemStatus === ItemStatus.RegistrationRequested) {
      depositInfo = await getSubmissionChallengeDepositAmount();
    } else {
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
  } catch (error: any) {
    console.error("Error challenging request:", error);

    // Format error for user
    let errorMessage = "Failed to challenge request";

    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user";
    } else if (error.message) {
      errorMessage = `Error: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
}

export function formatWalletAddress(address: string | null): string {
  if (!address) return "Not connected";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

export function handleWeb3Error(error: any): string {
  let message = "An unknown error occurred";

  if (typeof error === "string") {
    message = error;
  } else if (error?.message) {
    message = error.message.replace("MetaMask Tx Signature: ", "");

    // Clean up common Web3 errors
    if (message.includes("User denied")) {
      message = "Transaction was rejected";
    } else if (message.includes("insufficient funds")) {
      message = "Insufficient funds for transaction";
    }
  }

  // Limit message length
  if (message.length > 100) {
    message = message.substring(0, 100) + "...";
  }

  return message;
}

export async function switchToMainnet(): Promise<boolean> {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x1" }], // Ethereum Mainnet
    });
    return true;
  } catch (error: any) {
    console.error("Error switching network:", error);
    toast.error("Please switch to Ethereum Mainnet");
    return false;
  }
}
