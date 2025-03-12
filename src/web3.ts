import { toast } from "sonner";
import { AbiItem } from "web3-utils";
import { DepositInfo, ItemStatus } from "./types";
import { SupportedChainId } from "./index";

/**
 * LightCurateRegistry provides a class-based interface to interact with the LightGeneralizedTCR contract
 * using Web3.js
 */
export class LightCurateRegistry {
  private contractAddress: string;
  private chainId: SupportedChainId;
  private web3Instance: any = null;
  private contractInstance: any = null;

  // Supported chain IDs
  private static readonly SUPPORTED_CHAINS = {
    ETHEREUM_MAINNET: 1,
    GNOSIS_CHAIN: 100,
  } as const;

  /**
   * Creates a new LightCurateRegistry instance
   * @param contractAddress The address of the LightGeneralizedTCR contract
   * @param chainId The chain ID (1 for Ethereum Mainnet, 100 for Gnosis Chain)
   */
  constructor(contractAddress: string, chainId: SupportedChainId) {
    if (
      !Object.values(LightCurateRegistry.SUPPORTED_CHAINS).includes(chainId)
    ) {
      throw new Error(
        `Unsupported chain ID: ${chainId}. Supported chains are: ${Object.values(LightCurateRegistry.SUPPORTED_CHAINS).join(", ")}`
      );
    }

    this.contractAddress = contractAddress;
    this.chainId = chainId;
  }

  /**
   * Gets or creates a Web3 instance
   * @param provider Optional provider to use (defaults to window.ethereum or Infura)
   * @returns A Web3 instance
   */
  private getWeb3 = async (provider?: any): Promise<any> => {
    if (!this.web3Instance) {
      const Web3 = (await import("web3")).default;

      let rpcUrl;
      if (
        this.chainId === LightCurateRegistry.SUPPORTED_CHAINS.ETHEREUM_MAINNET
      ) {
        rpcUrl = "https://rpc.ankr.com/eth";
      } else if (
        this.chainId === LightCurateRegistry.SUPPORTED_CHAINS.GNOSIS_CHAIN
      ) {
        rpcUrl = "https://gnosis-pokt.nodies.app";
      } else {
        throw new Error(
          `Unsupported chain ID: ${this.chainId}. Supported chains are: ${Object.values(LightCurateRegistry.SUPPORTED_CHAINS).join(", ")}`
        );
      }

      this.web3Instance = new Web3(
        provider || (typeof window !== "undefined" && window.ethereum) || rpcUrl
      );
    }
    return this.web3Instance;
  };

  /**
   * Gets or creates a contract instance
   * @returns The contract instance
   */
  private getContract = async (): Promise<any> => {
    if (!this.contractInstance) {
      const web3 = await this.getWeb3();
      const LCURATE_ABI = (
        await import("./references/LightCurate/LightGeneralizedTCR_ABI.json")
      ).default;

      this.contractInstance = new web3.eth.Contract(
        LCURATE_ABI as AbiItem[],
        this.contractAddress
      );
    }
    return this.contractInstance;
  };

  /**
   * Connects to the user's Ethereum wallet and ensures correct chain
   * @returns Promise resolving to the connected account address
   */
  connectWallet = async (): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
    }

    try {
      // First request accounts
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Then ensure we're on the correct chain
      await this.ensureCorrectChain();

      return accounts[0];
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      throw new Error(`Failed to connect wallet: ${error.message}`);
    }
  };

  /**
   * Ensures the wallet is connected to the correct chain
   */
  private ensureCorrectChain = async (): Promise<void> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("MetaMask is not installed");
    }

    try {
      // Get current chain ID
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      // Convert hex chainId to number
      const currentChainIdNumber = parseInt(currentChainId, 16);

      // If we're not on the correct chain, try to switch
      if (currentChainIdNumber !== this.chainId) {
        const chainIdHex = `0x${this.chainId.toString(16)}`;

        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }],
          });
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask
          if (switchError.code === 4902) {
            await this.addChainToWallet();
          } else {
            throw switchError;
          }
        }
      }
    } catch (error: any) {
      console.error("Error ensuring correct chain:", error);
      throw new Error(
        `Please switch to ${this.getChainName()}: ${error.message}`
      );
    }
  };

  /**
   * Adds the chain to the wallet if it doesn't exist
   */
  private addChainToWallet = async (): Promise<void> => {
    if (typeof window === "undefined" || !window.ethereum) return;

    const chainParams = this.getChainParameters();

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [chainParams],
    });
  };

  /**
   * Gets the chain parameters for adding to wallet
   */
  private getChainParameters = (): any => {
    if (
      this.chainId === LightCurateRegistry.SUPPORTED_CHAINS.ETHEREUM_MAINNET
    ) {
      return {
        chainId: "0x1",
        chainName: "Ethereum Mainnet",
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: [
          "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        ],
        blockExplorerUrls: ["https://etherscan.io"],
      };
    } else if (
      this.chainId === LightCurateRegistry.SUPPORTED_CHAINS.GNOSIS_CHAIN
    ) {
      return {
        chainId: "0x64",
        chainName: "Gnosis Chain",
        nativeCurrency: {
          name: "xDai",
          symbol: "xDAI",
          decimals: 18,
        },
        rpcUrls: ["https://gnosis-pokt.nodies.app"],
        blockExplorerUrls: ["https://gnosisscan.io"],
      };
    }

    throw new Error("Unsupported chain ID");
  };

  /**
   * Gets the chain name based on chain ID
   */
  private getChainName = (): string => {
    return this.chainId ===
      LightCurateRegistry.SUPPORTED_CHAINS.ETHEREUM_MAINNET
      ? "Ethereum Mainnet"
      : "Gnosis Chain";
  };

  /**
   * Gets the currently connected account
   * @returns Promise resolving to the current account address or null
   */
  getCurrentAccount = async (): Promise<string | null> => {
    if (typeof window === "undefined" || !window.ethereum) return null;

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      return accounts[0] || null;
    } catch (error) {
      console.error("Error getting current account:", error);
      return null;
    }
  };

  /**
   * Gets the challenge period duration in days
   * @returns Promise resolving to the challenge period in days
   */
  getChallengePeriodDurationInDays = async (): Promise<number> => {
    try {
      const contract = await this.getContract();

      // Get challengePeriodDuration in seconds
      const challengePeriodInSeconds = await contract.methods
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
  };

  /**
   * Gets or creates a Kleros Liquid contract instance
   * @param arbitratorAddress The address of the Kleros Liquid arbitrator
   * @returns The Kleros Liquid contract instance
   */
  private getKlerosLiquidContract = async (
    arbitratorAddress: string
  ): Promise<any> => {
    const web3 = await this.getWeb3();

    // Import the Kleros Liquid ABI
    const KLEROS_LIQUID_ABI = (
      await import("./references/KlerosLiquid/KlerosLiquid_ABI.json")
    ).default;

    // Create new contract instance
    return new web3.eth.Contract(
      KLEROS_LIQUID_ABI as AbiItem[],
      arbitratorAddress
    );
  };

  /**
   * Gets the arbitration cost
   * @returns Promise resolving to the arbitration cost information
   */
  getArbitrationCost = async (): Promise<{
    arbitrationCost: string;
    arbitrationCostWei: string;
    arbitrator: any;
  }> => {
    try {
      const web3 = await this.getWeb3();
      const contract = await this.getContract();

      // Get arbitrator address and extra data
      const arbitratorAddress = await contract.methods.arbitrator().call();
      const arbitratorExtraData = await contract.methods
        .arbitratorExtraData()
        .call();

      console.log("Arbitrator address:", arbitratorAddress);
      console.log("Arbitrator extra data:", arbitratorExtraData);

      // Create Kleros Liquid arbitrator contract instance
      if (!arbitratorAddress || typeof arbitratorAddress !== "string") {
        throw new Error("Invalid arbitrator address");
      }

      // Use the helper method to get the Kleros Liquid instance
      const klerosLiquidInstance =
        await this.getKlerosLiquidContract(arbitratorAddress);

      // Get actual arbitration cost
      const arbitrationCostWei = await klerosLiquidInstance.methods
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
        arbitrator: klerosLiquidInstance,
      };
    } catch (error) {
      console.error("Error getting arbitration cost:", error);
      throw new Error("Failed to retrieve arbitration cost");
    }
  };

  /**
   * Calculates deposit amount for various operations
   * Using arrow function to preserve 'this' context
   * @param baseDepositMethod The contract method to call for base deposit
   * @param baseDepositName Human-readable name for the deposit type
   * @returns Promise resolving to deposit information
   */
  private calculateDepositAmount = async (
    baseDepositMethod: string,
    baseDepositName: string
  ): Promise<DepositInfo> => {
    try {
      const web3 = await this.getWeb3();
      const contract = await this.getContract();

      // Get challenge period duration
      const challengePeriodDays = await this.getChallengePeriodDurationInDays();

      // Get base deposit
      const baseDepositResult =
        await contract.methods[baseDepositMethod]().call();
      const baseDeposit = baseDepositResult
        ? baseDepositResult.toString()
        : "0";

      // Get arbitration cost
      const { arbitrationCost, arbitrationCostWei } =
        await this.getArbitrationCost();

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
  };

  /**
   * Gets the submission deposit amount
   * @returns Promise resolving to deposit information
   */
  getSubmissionDepositAmount = async (): Promise<DepositInfo> => {
    return this.calculateDepositAmount(
      "submissionBaseDeposit",
      "submission deposit"
    );
  };

  /**
   * Gets the submission challenge deposit amount
   * @returns Promise resolving to deposit information
   */
  getSubmissionChallengeDepositAmount = async (): Promise<DepositInfo> => {
    return this.calculateDepositAmount(
      "submissionChallengeBaseDeposit",
      "submission challenge deposit"
    );
  };

  /**
   * Gets the removal deposit amount
   * @returns Promise resolving to deposit information
   */
  getRemovalDepositAmount = async (): Promise<DepositInfo> => {
    return this.calculateDepositAmount("removalBaseDeposit", "removal deposit");
  };

  /**
   * Gets the removal challenge deposit amount
   * @returns Promise resolving to deposit information
   */
  getRemovalChallengeDepositAmount = async (): Promise<DepositInfo> => {
    return this.calculateDepositAmount(
      "removalChallengeBaseDeposit",
      "removal challenge deposit"
    );
  };

  /**
   * Submits an item to the registry
   * @param ipfsPath The IPFS path of the item
   * @returns Promise resolving to the transaction hash
   */
  submitToRegistry = async (ipfsPath: string): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
    }

    // Ensure ipfsPath starts with "/ipfs/"
    const formattedPath = ipfsPath.startsWith("/ipfs/")
      ? ipfsPath
      : `/ipfs/${ipfsPath}`;

    try {
      // Ensure we're on the correct chain
      await this.ensureCorrectChain();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const from = accounts[0];

      // Create Web3 instance
      const web3 = await this.getWeb3(window.ethereum);
      const contract = await this.getContract();

      // Get required deposit amount
      const { depositInWei } = await this.getSubmissionDepositAmount();

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
      const gasWithBuffer = (
        (gasBigInt * BigInt(120)) /
        BigInt(100)
      ).toString();

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
  };

  /**
   * Removes an item from the registry
   * @param itemID The ID of the item to remove
   * @param evidence Optional evidence IPFS path
   * @returns Promise resolving to the transaction hash
   */
  removeItem = async (
    itemID: string,
    evidence: string = ""
  ): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
    }

    try {
      // Ensure we're on the correct chain
      await this.ensureCorrectChain();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const from = accounts[0];

      // Create Web3 instance
      const web3 = await this.getWeb3(window.ethereum);
      const contract = await this.getContract();

      // Get required deposit amount
      const { depositInWei } = await this.getRemovalDepositAmount();

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
      const gasWithBuffer = (
        (gasBigInt * BigInt(120)) /
        BigInt(100)
      ).toString();

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
  };

  /**
   * Challenges a request
   * @param itemID The ID of the item
   * @param evidence Optional evidence IPFS path
   * @returns Promise resolving to the transaction hash
   */
  challengeRequest = async (
    itemID: string,
    evidence: string = ""
  ): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
    }

    try {
      // Ensure we're on the correct chain
      await this.ensureCorrectChain();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const from = accounts[0];

      // Create Web3 instance
      const web3 = await this.getWeb3(window.ethereum);
      const contract = await this.getContract();

      // Get the item info to determine its status
      const itemResult = (await contract.methods.items(itemID).call()) as {
        status: string | number;
      };

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
        depositInfo = await this.getSubmissionChallengeDepositAmount();
      } else {
        depositInfo = await this.getRemovalChallengeDepositAmount();
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
      const gasWithBuffer = (
        (gasBigInt * BigInt(120)) /
        BigInt(100)
      ).toString();

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
  };

  /**
   * Formats a wallet address for display
   * @param address The wallet address
   * @returns Formatted address string
   */
  formatWalletAddress = (address: string | null): string => {
    if (!address) return "Not connected";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  /**
   * Handles Web3 errors
   * @param error The error object
   * @returns Formatted error message
   */
  handleWeb3Error = (error: any): string => {
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
  };

  /**
   * Switches to the correct chain based on the chainId provided in constructor
   * @returns Promise resolving to success status
   */
  switchToCorrectChain = async (): Promise<boolean> => {
    try {
      await this.ensureCorrectChain();
      return true;
    } catch (error: any) {
      console.error("Error switching network:", error);
      if (typeof toast !== "undefined") {
        toast.error(`Please switch to ${this.getChainName()}`);
      }
      return false;
    }
  };

  /**
   * Gets the current chain ID
   * @returns The chain ID
   */
  getChainId = (): number => {
    return this.chainId;
  };

  /**
   * Submit evidence for an item in the registry
   * @param itemID The ID of the item which the evidence is related to
   * @param evidenceURI A link to an evidence using its IPFS URI
   * @returns Transaction hash of the evidence submission
   */
  submitEvidence = async (
    itemID: string,
    evidenceURI: string
  ): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
    }

    try {
      // Ensure we're on the correct chain
      await this.ensureCorrectChain();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const from = accounts[0];

      // Create Web3 instance
      const web3 = await this.getWeb3(window.ethereum);
      const contract = await this.getContract();

      // Format evidence URI - ensure it starts with "/ipfs/"
      const formattedEvidence = evidenceURI
        ? evidenceURI.startsWith("/ipfs/")
          ? evidenceURI
          : `/ipfs/${evidenceURI}`
        : "";

      // Estimate gas and get current gas price
      const gasEstimate = await contract.methods
        .submitEvidence(itemID, formattedEvidence)
        .estimateGas({
          from,
        });
      const gasPrice = await web3.eth.getGasPrice();

      // Calculate gas with 20% buffer
      const gasBigInt = BigInt(gasEstimate);
      const gasWithBuffer = (
        (gasBigInt * BigInt(120)) /
        BigInt(100)
      ).toString();

      // Submit transaction
      const txReceipt = await contract.methods
        .submitEvidence(itemID, formattedEvidence)
        .send({
          from,
          gas: gasWithBuffer,
          gasPrice: gasPrice.toString(),
        });

      return txReceipt.transactionHash;
    } catch (error: any) {
      console.error("Error submitting evidence:", error);

      // Format error for user
      let errorMessage = "Failed to submit evidence";

      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  };

  /**
   * Gets the appeal cost for a specific item and request
   * @param itemID The ID of the item
   * @param requestID The ID of the request (usually 0 for new items)
   * @returns Promise resolving to appeal cost information
   */
  getAppealCost = async (
    itemID: string,
    requestID: number = 0
  ): Promise<{
    requesterAppealFee: string;
    challengerAppealFee: string;
    requesterAppealFeeWei: string;
    challengerAppealFeeWei: string;
    currentRuling: number;
  }> => {
    let web3;
    let contract;
    let disputeData;
    let arbitratorAddress;
    let disputeID;
    let arbitratorExtraData;
    let currentRuling;
    let klerosLiquidInstance;
    let arbitrationCostWei;

    // Step 1: Initialize web3 and contract instances
    try {
      console.log(
        `Getting appeal cost for itemID: ${itemID}, requestID: ${requestID}`
      );
      web3 = await this.getWeb3();
      contract = await this.getContract();
    } catch (error) {
      console.error("Error initializing web3 or contract:", error);
      throw new Error(
        `Failed to initialize web3 or contract: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Step 2: Get dispute data
    try {
      console.log(
        `Fetching dispute data for itemID: ${itemID}, requestID: ${requestID}`
      );
      disputeData = await contract.methods
        .getRequestInfo(itemID, requestID)
        .call();

      if (!disputeData.disputed) {
        console.error("Item is not disputed", disputeData);
        throw new Error("Item is not disputed, no appeal cost available");
      }

      // Field names corrected to match the ABI
      arbitratorAddress = disputeData.requestArbitrator;
      disputeID = disputeData.disputeID;
      arbitratorExtraData = disputeData.requestArbitratorExtraData;
      currentRuling = parseInt(disputeData.ruling);

      console.log("Dispute data:", {
        arbitratorAddress,
        disputeID,
        arbitratorExtraData,
        numberOfRounds: parseInt(disputeData.numberOfRounds),
        currentRuling,
      });
    } catch (error) {
      console.error("Error getting dispute data:", error);
      throw new Error(
        `Failed to get dispute data: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Step 3: Get Kleros Liquid contract instance
    try {
      console.log(
        `Getting Kleros Liquid contract instance for arbitrator: ${arbitratorAddress}`
      );
      klerosLiquidInstance =
        await this.getKlerosLiquidContract(arbitratorAddress);
    } catch (error) {
      console.error("Error getting Kleros Liquid contract:", error);
      throw new Error(
        `Failed to get Kleros Liquid contract: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Step 4: Get appeal cost from arbitrator
    try {
      console.log(
        `Getting appeal cost for disputeID: ${disputeID} and ${arbitratorExtraData}`
      );
      arbitrationCostWei = await klerosLiquidInstance.methods
        .appealCost(disputeID, arbitratorExtraData)
        .call();

      console.log(`Appeal base cost: ${arbitrationCostWei} wei`);
    } catch (error) {
      console.error("Error getting appeal cost from arbitrator:", error);
      throw new Error(
        `Failed to get appeal cost from arbitrator: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Step 5: Get multipliers and calculate fees
    let loserStakeMultiplier;
    let winnerStakeMultiplier;
    let sharedStakeMultiplier;
    let requesterAppealFeeWei;
    let challengerAppealFeeWei;

    try {
      console.log("Getting stake multipliers");
      loserStakeMultiplier = await contract.methods
        .loserStakeMultiplier()
        .call();
      winnerStakeMultiplier = await contract.methods
        .winnerStakeMultiplier()
        .call();
      sharedStakeMultiplier = await contract.methods
        .sharedStakeMultiplier()
        .call();

      console.log("Stake multipliers:", {
        loserStakeMultiplier,
        winnerStakeMultiplier,
        sharedStakeMultiplier,
      });

      const MULTIPLIER_DIVISOR = 10000; // 100% is 10000 in the contract

      // Convert to BigInt for safe math operations with large numbers
      const arbitrationCost = BigInt(arbitrationCostWei);

      // Calculate appeal fees based on ruling
      if (currentRuling === 0) {
        // No ruling, use shared stake multiplier for both parties
        const sharedMultiplier = BigInt(sharedStakeMultiplier);
        const stake =
          (arbitrationCost * sharedMultiplier) / BigInt(MULTIPLIER_DIVISOR);

        requesterAppealFeeWei = (arbitrationCost + stake).toString();
        challengerAppealFeeWei = (arbitrationCost + stake).toString();
      } else if (currentRuling === 1) {
        // Requester is winning, apply loser multiplier to challenger and winner to requester
        const winnerMultiplier = BigInt(winnerStakeMultiplier);
        const loserMultiplier = BigInt(loserStakeMultiplier);

        const requesterStake =
          (arbitrationCost * winnerMultiplier) / BigInt(MULTIPLIER_DIVISOR);
        const challengerStake =
          (arbitrationCost * loserMultiplier) / BigInt(MULTIPLIER_DIVISOR);

        requesterAppealFeeWei = (arbitrationCost + requesterStake).toString();
        challengerAppealFeeWei = (arbitrationCost + challengerStake).toString();
      } else if (currentRuling === 2) {
        // Challenger is winning, apply loser multiplier to requester and winner to challenger
        const winnerMultiplier = BigInt(winnerStakeMultiplier);
        const loserMultiplier = BigInt(loserStakeMultiplier);

        const requesterStake =
          (arbitrationCost * loserMultiplier) / BigInt(MULTIPLIER_DIVISOR);
        const challengerStake =
          (arbitrationCost * winnerMultiplier) / BigInt(MULTIPLIER_DIVISOR);

        requesterAppealFeeWei = (arbitrationCost + requesterStake).toString();
        challengerAppealFeeWei = (arbitrationCost + challengerStake).toString();
      }

      console.log("Calculated appeal fees:", {
        requesterAppealFeeWei,
        challengerAppealFeeWei,
      });
    } catch (error) {
      console.error("Error calculating appeal fees:", error);
      throw new Error(
        `Failed to calculate appeal fees: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }

    // Step 6: Convert Wei to ETH and return results
    try {
      console.log("Converting Wei to ETH");
      const requesterAppealFee = web3.utils.fromWei(
        requesterAppealFeeWei,
        "ether"
      );
      const challengerAppealFee = web3.utils.fromWei(
        challengerAppealFeeWei,
        "ether"
      );

      // Ensure these variables are never undefined
      requesterAppealFeeWei = requesterAppealFeeWei || "0";
      challengerAppealFeeWei = challengerAppealFeeWei || "0";

      console.log("Final appeal costs:", {
        requesterAppealFee,
        challengerAppealFee,
        currentRuling,
      });

      return {
        requesterAppealFee,
        challengerAppealFee,
        requesterAppealFeeWei,
        challengerAppealFeeWei,
        currentRuling,
      };
    } catch (error) {
      console.error("Error converting and returning results:", error);
      throw new Error(
        `Failed to convert or return results: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  };

  /**
   * Contribute to a side in a dispute
   * @param itemID The ID of the item
   * @param requestID The ID of the request (usually 0 for new items)
   * @param side The side to contribute to (1 = Requester, 2 = Challenger)
   * @param amount Amount to contribute in ETH
   * @returns Transaction hash of the contribution
   */
  contribute = async (
    itemID: string,
    requestID: number = 0,
    side: 1 | 2,
    amount: string
  ): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
    }

    try {
      // Ensure we're on the correct chain
      await this.ensureCorrectChain();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const from = accounts[0];

      // Create Web3 instance
      const web3 = await this.getWeb3(window.ethereum);
      const contract = await this.getContract();

      // Convert ETH amount to Wei
      const amountWei = web3.utils.toWei(amount, "ether");

      // Estimate gas and get current gas price
      const gasEstimate = await contract.methods
        .contribute(itemID, requestID, side)
        .estimateGas({
          from,
          value: amountWei,
        });
      const gasPrice = await web3.eth.getGasPrice();

      // Calculate gas with 20% buffer
      const gasBigInt = BigInt(gasEstimate);
      const gasWithBuffer = (
        (gasBigInt * BigInt(120)) /
        BigInt(100)
      ).toString();

      // Submit contribution transaction
      const txReceipt = await contract.methods
        .contribute(itemID, requestID, side)
        .send({
          from,
          gas: gasWithBuffer,
          gasPrice: gasPrice.toString(),
          value: amountWei,
        });

      return txReceipt.transactionHash;
    } catch (error: any) {
      console.error("Error contributing to dispute:", error);

      // Format error for user
      let errorMessage = "Failed to contribute to dispute";

      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  };

  /**
   * Gets the current appeal funding status
   * @param itemID The ID of the item
   * @param requestID The ID of the request (usually 0 for new items)
   * @returns Promise resolving to appeal funding information
   */
  getAppealFundingStatus = async (
    itemID: string,
    requestID: number = 0
  ): Promise<{
    requesterFunded: boolean;
    challengerFunded: boolean;
    requesterAmountPaid: string;
    challengerAmountPaid: string;
    requesterAmountPaidWei: string;
    challengerAmountPaidWei: string;
    requesterRemainingToFund: string;
    challengerRemainingToFund: string;
    requesterRemainingToFundWei: string;
    challengerRemainingToFundWei: string;
    appealed: boolean;
    currentRuling: number;
    roundIndex: number;
  }> => {
    try {
      const web3 = await this.getWeb3();
      const contract = await this.getContract();

      // Get dispute data for the item and request
      const disputeData = await contract.methods
        .getRequestInfo(itemID, requestID)
        .call();

      // If the request isn't disputed, there's no appeal funding
      if (!disputeData.disputed) {
        throw new Error("Item is not disputed, no appeal funding available");
      }

      const numberOfRounds = parseInt(disputeData.numberOfRounds);
      const currentRuling = parseInt(disputeData.ruling);

      // Current round index (0-based, so subtract 1)
      const roundIndex = numberOfRounds - 1;

      // Get the round info for the current round
      const roundInfo = await contract.methods
        .getRoundInfo(itemID, requestID, roundIndex)
        .call();

      // Extract values from round info
      const appealed = roundInfo.appealed;

      // Party enum: None = 0, Requester = 1, Challenger = 2
      const requesterAmountPaidWei = roundInfo.amountPaid[1]; // Requester = 1
      const challengerAmountPaidWei = roundInfo.amountPaid[2]; // Challenger = 2

      const requesterFunded = roundInfo.hasPaid[1]; // Requester = 1
      const challengerFunded = roundInfo.hasPaid[2]; // Challenger = 2

      // Convert Wei to ETH for display
      const requesterAmountPaid = web3.utils.fromWei(
        requesterAmountPaidWei,
        "ether"
      );
      const challengerAmountPaid = web3.utils.fromWei(
        challengerAmountPaidWei,
        "ether"
      );

      // Get total appeal costs
      const appealCosts = await this.getAppealCost(itemID, requestID);

      // Calculate remaining amounts to fund
      const requesterRemainingToFundWei =
        BigInt(appealCosts.requesterAppealFeeWei) -
        BigInt(requesterAmountPaidWei);
      const challengerRemainingToFundWei =
        BigInt(appealCosts.challengerAppealFeeWei) -
        BigInt(challengerAmountPaidWei);

      // Convert to strings, ensuring non-negative values
      const requesterRemainingToFundWeiStr =
        requesterRemainingToFundWei > 0
          ? requesterRemainingToFundWei.toString()
          : "0";
      const challengerRemainingToFundWeiStr =
        challengerRemainingToFundWei > 0
          ? challengerRemainingToFundWei.toString()
          : "0";

      // Convert to ETH for display
      const requesterRemainingToFund = web3.utils.fromWei(
        requesterRemainingToFundWeiStr,
        "ether"
      );
      const challengerRemainingToFund = web3.utils.fromWei(
        challengerRemainingToFundWeiStr,
        "ether"
      );

      return {
        requesterFunded,
        challengerFunded,
        requesterAmountPaid,
        challengerAmountPaid,
        requesterAmountPaidWei,
        challengerAmountPaidWei,
        requesterRemainingToFund,
        challengerRemainingToFund,
        requesterRemainingToFundWei: requesterRemainingToFundWeiStr,
        challengerRemainingToFundWei: challengerRemainingToFundWeiStr,
        appealed,
        currentRuling,
        roundIndex,
      };
    } catch (error: any) {
      console.error("Error getting appeal funding status:", error);
      throw new Error(`Failed to get appeal funding status: ${error.message}`);
    }
  };

  /**
   * Fund an appeal for a ruling, supporting partial funding for crowdfunding
   * @param itemID The ID of the item
   * @param requestID The ID of the request (usually 0 for new items)
   * @param side The side to fund the appeal for (1 = Requester, 2 = Challenger)
   * @param amount Optional amount to contribute (if not specified, will fund the remaining required amount).
   *               Partial amounts are allowed for crowdfunding appeals.
   * @returns Transaction hash of the appeal funding
   */
  fundAppeal = async (
    itemID: string,
    requestID: number = 0,
    side: 1 | 2,
    amount?: string
  ): Promise<string> => {
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error(
        "MetaMask is not installed. Please install MetaMask to continue."
      );
    }

    try {
      // Ensure we're on the correct chain
      await this.ensureCorrectChain();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const from = accounts[0];

      // Create Web3 instance
      const web3 = await this.getWeb3(window.ethereum);
      const contract = await this.getContract();

      // Get current funding status
      const fundingStatus = await this.getAppealFundingStatus(
        itemID,
        requestID
      );

      // Check if side is already fully funded
      if (
        (side === 1 && fundingStatus.requesterFunded) ||
        (side === 2 && fundingStatus.challengerFunded)
      ) {
        throw new Error(`Appeal for this side is already fully funded`);
      }

      // Determine amount to send
      let amountToSendWei: string;

      if (amount) {
        // User specified amount
        amountToSendWei = web3.utils.toWei(amount, "ether");

        // Get the remaining amount needed
        const remainingNeededWei =
          side === 1
            ? fundingStatus.requesterRemainingToFundWei
            : fundingStatus.challengerRemainingToFundWei;

        // Check if user is trying to contribute more than needed
        if (BigInt(amountToSendWei) > BigInt(remainingNeededWei)) {
          amountToSendWei = remainingNeededWei;
        }
      } else {
        // Auto-calculate amount - send only what's remaining to fund
        amountToSendWei =
          side === 1
            ? fundingStatus.requesterRemainingToFundWei
            : fundingStatus.challengerRemainingToFundWei;
      }

      // If amount is 0, the appeal is already fully funded
      if (amountToSendWei === "0") {
        throw new Error(`This side of the appeal is already fully funded`);
      }

      // Estimate gas and get current gas price
      const gasEstimate = await contract.methods
        .fundAppeal(itemID, requestID, side)
        .estimateGas({
          from,
          value: amountToSendWei,
        });
      const gasPrice = await web3.eth.getGasPrice();

      // Calculate gas with 20% buffer
      const gasBigInt = BigInt(gasEstimate);
      const gasWithBuffer = (
        (gasBigInt * BigInt(120)) /
        BigInt(100)
      ).toString();

      // Submit fund appeal transaction
      const txReceipt = await contract.methods
        .fundAppeal(itemID, requestID, side)
        .send({
          from,
          gas: gasWithBuffer,
          gasPrice: gasPrice.toString(),
          value: amountToSendWei,
        });

      return txReceipt.transactionHash;
    } catch (error: any) {
      console.error("Error funding appeal:", error);

      // Format error for user
      let errorMessage = "Failed to fund appeal";

      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  };

  /**
   * Gets the latest MetaEvidence URIs for both registration and clearing requests
   * @returns Promise resolving to an object containing both MetaEvidence URIs
   */
  getLatestMetaEvidence = async (): Promise<{
    registrationMetaEvidence: string;
    clearingMetaEvidence: string;
  }> => {
    try {
      // Use existing web3 instance and contract from the class
      const web3 = await this.getWeb3();
      const contract = await this.getContract();

      console.log("Getting MetaEvidence updates...");
      // Get the number of MetaEvidence updates
      const metaEvidenceUpdates = await contract.methods
        .metaEvidenceUpdates()
        .call();
      console.log("MetaEvidence updates:", metaEvidenceUpdates);

      // Calculate the latest MetaEvidence IDs
      const latestRegistrationId = 2 * (Number(metaEvidenceUpdates) - 1);
      const latestClearingId = latestRegistrationId + 1;
      console.log("Latest registration ID:", latestRegistrationId);
      console.log("Latest clearing ID:", latestClearingId);

      // Get past events for both MetaEvidence types
      console.log("Fetching past MetaEvidence events...");
      const events = await contract.getPastEvents("MetaEvidence", {
        fromBlock: 0,
      });
      console.log(`Found ${events.length} MetaEvidence events total`);

      // Log all events for inspection
      events.forEach(
        (
          e: { returnValues: { _metaEvidenceID: string; _evidence: string } },
          i: number
        ) => {
          console.log(
            `Event ${i}: ID=${e.returnValues._metaEvidenceID}, Evidence=${e.returnValues._evidence}`
          );
        }
      );

      // Find the specific events
      console.log(
        "Looking for registration event with ID:",
        latestRegistrationId
      );
      const registrationEvent = events.find(
        (e: { returnValues: { _metaEvidenceID: string } }) => {
          console.log(
            `Comparing: event ID "${e.returnValues._metaEvidenceID}" (${typeof e.returnValues._metaEvidenceID}) with search ID "${latestRegistrationId.toString()}" (${typeof latestRegistrationId.toString()})`
          );
          return (
            e.returnValues._metaEvidenceID == latestRegistrationId.toString()
          );
        }
      );
      console.log("Registration event found:", !!registrationEvent);

      console.log("Looking for clearing event with ID:", latestClearingId);
      const clearingEvent = events.find(
        (e: { returnValues: { _metaEvidenceID: string } }) => {
          console.log(
            `Comparing: event ID "${e.returnValues._metaEvidenceID}" (${typeof e.returnValues._metaEvidenceID}) with search ID "${latestClearingId.toString()}" (${typeof latestClearingId.toString()})`
          );
          return e.returnValues._metaEvidenceID == latestClearingId.toString();
        }
      );
      console.log("Clearing event found:", !!clearingEvent);

      if (!registrationEvent || !clearingEvent) {
        // If specific events not found, let's try to use the first pair
        if (events.length >= 2) {
          console.log(
            "Specific events not found. Attempting to use the first registration and clearing events..."
          );
          const firstEvents = events.filter(
            (e: { returnValues: { _metaEvidenceID: string } }) => {
              console.log(
                `Filtering: event ID "${e.returnValues._metaEvidenceID}" (${typeof e.returnValues._metaEvidenceID})`
              );
              return (
                e.returnValues._metaEvidenceID == "0" ||
                e.returnValues._metaEvidenceID == "1"
              );
            }
          );
          console.log(`Found ${firstEvents.length} initial events`);

          if (firstEvents.length >= 2) {
            return {
              registrationMetaEvidence: firstEvents[0].returnValues._evidence,
              clearingMetaEvidence: firstEvents[1].returnValues._evidence,
            };
          }
        }

        throw new Error("Could not find latest MetaEvidence events");
      }

      return {
        registrationMetaEvidence: registrationEvent.returnValues._evidence,
        clearingMetaEvidence: clearingEvent.returnValues._evidence,
      };
    } catch (error: any) {
      console.error("Error fetching MetaEvidence:", error);
      throw new Error(`Failed to fetch MetaEvidence: ${error.message}`);
    }
  };
}
