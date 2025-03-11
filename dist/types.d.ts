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
