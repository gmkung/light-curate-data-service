declare global {
    interface Window {
        ethereum?: any;
    }
}
export declare enum ItemStatus {
    Absent = 0,
    Registered = 1,
    RegistrationRequested = 2,
    ClearingRequested = 3
}
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
export declare function connectWallet(): Promise<string>;
export declare function getCurrentAccount(): Promise<string | null>;
export declare function getChallengePeriodDurationInDays(): Promise<number>;
export declare function getSubmissionDepositAmount(): Promise<DepositInfo>;
export declare function getSubmissionChallengeDepositAmount(): Promise<DepositInfo>;
export declare function getRemovalDepositAmount(): Promise<DepositInfo>;
export declare function getRemovalChallengeDepositAmount(): Promise<DepositInfo>;
export declare function submitToRegistry(ipfsPath: string): Promise<string>;
export declare function removeItem(itemID: string, evidence?: string): Promise<string>;
export declare function challengeRequest(itemID: string, evidence?: string): Promise<string>;
export declare function formatWalletAddress(address: string | null): string;
export declare function handleWeb3Error(error: any): string;
export declare function switchToMainnet(): Promise<boolean>;
