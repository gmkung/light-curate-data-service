import { DepositInfo } from "./types";
import { SupportedChainId } from "./index";
/**
 * LightCurateRegistry provides a class-based interface to interact with the LightGeneralizedTCR contract
 * using Web3.js
 */
export declare class LightCurateRegistry {
    private contractAddress;
    private chainId;
    private web3Instance;
    private contractInstance;
    private static readonly SUPPORTED_CHAINS;
    /**
     * Creates a new LightCurateRegistry instance
     * @param contractAddress The address of the LightGeneralizedTCR contract
     * @param chainId The chain ID (1 for Ethereum Mainnet, 100 for Gnosis Chain)
     */
    constructor(contractAddress: string, chainId: SupportedChainId);
    /**
     * Gets or creates a Web3 instance
     * @param provider Optional provider to use (defaults to window.ethereum or Infura)
     * @returns A Web3 instance
     */
    private getWeb3;
    /**
     * Gets or creates a contract instance
     * @returns The contract instance
     */
    private getContract;
    /**
     * Connects to the user's Ethereum wallet and ensures correct chain
     * @returns Promise resolving to the connected account address
     */
    connectWallet: () => Promise<string>;
    /**
     * Ensures the wallet is connected to the correct chain
     */
    private ensureCorrectChain;
    /**
     * Adds the chain to the wallet if it doesn't exist
     */
    private addChainToWallet;
    /**
     * Gets the chain parameters for adding to wallet
     */
    private getChainParameters;
    /**
     * Gets the chain name based on chain ID
     */
    private getChainName;
    /**
     * Gets the currently connected account
     * @returns Promise resolving to the current account address or null
     */
    getCurrentAccount: () => Promise<string | null>;
    /**
     * Gets the challenge period duration in days
     * @returns Promise resolving to the challenge period in days
     */
    getChallengePeriodDurationInDays: () => Promise<number>;
    /**
     * Gets or creates a Kleros Liquid contract instance
     * @param arbitratorAddress The address of the Kleros Liquid arbitrator
     * @returns The Kleros Liquid contract instance
     */
    private getKlerosLiquidContract;
    /**
     * Gets the arbitration cost
     * @returns Promise resolving to the arbitration cost information
     */
    getArbitrationCost: () => Promise<{
        arbitrationCost: string;
        arbitrationCostWei: string;
        arbitrator: any;
    }>;
    /**
     * Calculates deposit amount for various operations
     * Using arrow function to preserve 'this' context
     * @param baseDepositMethod The contract method to call for base deposit
     * @param baseDepositName Human-readable name for the deposit type
     * @returns Promise resolving to deposit information
     */
    private calculateDepositAmount;
    /**
     * Gets the submission deposit amount
     * @returns Promise resolving to deposit information
     */
    getSubmissionDepositAmount: () => Promise<DepositInfo>;
    /**
     * Gets the submission challenge deposit amount
     * @returns Promise resolving to deposit information
     */
    getSubmissionChallengeDepositAmount: () => Promise<DepositInfo>;
    /**
     * Gets the removal deposit amount
     * @returns Promise resolving to deposit information
     */
    getRemovalDepositAmount: () => Promise<DepositInfo>;
    /**
     * Gets the removal challenge deposit amount
     * @returns Promise resolving to deposit information
     */
    getRemovalChallengeDepositAmount: () => Promise<DepositInfo>;
    /**
     * Submits an item to the registry
     * @param ipfsPath The IPFS path of the item
     * @returns Promise resolving to the transaction hash
     */
    submitToRegistry: (ipfsPath: string) => Promise<string>;
    /**
     * Removes an item from the registry
     * @param itemID The ID of the item to remove
     * @param evidence Optional evidence IPFS path
     * @returns Promise resolving to the transaction hash
     */
    removeItem: (itemID: string, evidence?: string) => Promise<string>;
    /**
     * Challenges a request
     * @param itemID The ID of the item
     * @param evidence Optional evidence IPFS path
     * @returns Promise resolving to the transaction hash
     */
    challengeRequest: (itemID: string, evidence?: string) => Promise<string>;
    /**
     * Formats a wallet address for display
     * @param address The wallet address
     * @returns Formatted address string
     */
    formatWalletAddress: (address: string | null) => string;
    /**
     * Handles Web3 errors
     * @param error The error object
     * @returns Formatted error message
     */
    handleWeb3Error: (error: any) => string;
    /**
     * Switches to the correct chain based on the chainId provided in constructor
     * @returns Promise resolving to success status
     */
    switchToCorrectChain: () => Promise<boolean>;
    /**
     * Gets the current chain ID
     * @returns The chain ID
     */
    getChainId: () => number;
    /**
     * Submit evidence for an item in the registry
     * @param itemID The ID of the item which the evidence is related to
     * @param evidenceURI A link to an evidence using its IPFS URI
     * @returns Transaction hash of the evidence submission
     */
    submitEvidence: (itemID: string, evidenceURI: string) => Promise<string>;
    /**
     * Gets the appeal cost for a specific item and request
     * @param itemID The ID of the item
     * @param requestID The ID of the request (usually 0 for new items)
     * @returns Promise resolving to appeal cost information
     */
    getAppealCost: (itemID: string, requestID?: number) => Promise<{
        requesterAppealFee: string;
        challengerAppealFee: string;
        requesterAppealFeeWei: string;
        challengerAppealFeeWei: string;
        currentRuling: number;
    }>;
    /**
     * Contribute to a side in a dispute
     * @param itemID The ID of the item
     * @param requestID The ID of the request (usually 0 for new items)
     * @param side The side to contribute to (1 = Requester, 2 = Challenger)
     * @param amount Amount to contribute in ETH
     * @returns Transaction hash of the contribution
     */
    contribute: (itemID: string, requestID: number | undefined, side: 1 | 2, amount: string) => Promise<string>;
    /**
     * Gets the current appeal funding status
     * @param itemID The ID of the item
     * @param requestID The ID of the request (usually 0 for new items)
     * @returns Promise resolving to appeal funding information
     */
    getAppealFundingStatus: (itemID: string, requestID?: number) => Promise<{
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
    }>;
    /**
     * Fund an appeal for a ruling, supporting partial funding for crowdfunding
     * @param itemID The ID of the item
     * @param requestID The ID of the request (usually 0 for new items)
     * @param side The side to fund the appeal for (1 = Requester, 2 = Challenger)
     * @param amount Optional amount to contribute (if not specified, will fund the remaining required amount).
     *               Partial amounts are allowed for crowdfunding appeals.
     * @returns Transaction hash of the appeal funding
     */
    fundAppeal: (itemID: string, requestID: number | undefined, side: 1 | 2, amount?: string) => Promise<string>;
    /**
     * Gets the latest MetaEvidence URIs for both registration and clearing requests
     * @returns Promise resolving to an object containing both MetaEvidence URIs
     */
    getLatestMetaEvidence: () => Promise<{
        registrationMetaEvidence: string;
        clearingMetaEvidence: string;
    }>;
}
