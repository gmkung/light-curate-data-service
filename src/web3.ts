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
  private klerosLiquidInstance: any = null;

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
        rpcUrl =
          "https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161";
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

      if (!this.klerosLiquidInstance) {
        const KLEROS_LIQUID_ABI = (
          await import("./references/KlerosLiquid/KlerosLiquid_ABI.json")
        ).default;
        this.klerosLiquidInstance = new web3.eth.Contract(
          KLEROS_LIQUID_ABI as AbiItem[],
          arbitratorAddress
        );
      }

      // Get actual arbitration cost
      const arbitrationCostWei = await this.klerosLiquidInstance.methods
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
        arbitrator: this.klerosLiquidInstance,
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
   * @param evidenceURI A link to an evidence using its URI
   * @returns Transaction hash of the evidence submission
   */
  async submitEvidence(itemID: string, evidenceURI: string): Promise<string> {
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
  }
}
