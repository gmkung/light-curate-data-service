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
export interface GraphQLResponse {
    data: {
        litems: LItem[];
    };
    errors?: Array<{
        message: string;
    }>;
}
export interface LItemProp {
    __typename: string;
    description: string;
    isIdentifier: boolean;
    label: string;
    type: string;
    value: string;
}
export interface LItemMetadata {
    __typename: string;
    props: LItemProp[];
}
export interface Round {
    __typename: string;
    amountPaidChallenger: string;
    amountPaidRequester: string;
    appealPeriodEnd: string;
    appealPeriodStart: string;
    hasPaidChallenger: boolean;
    hasPaidRequester: boolean;
    ruling: string;
}
export interface Request {
    __typename: string;
    challenger: string;
    deposit: string;
    disputeID: string;
    disputed: boolean;
    requester: string;
    resolutionTime: string;
    resolved: boolean;
    rounds: Round[];
    submissionTime: string;
}
export interface LItem {
    __typename: string;
    data: string;
    itemID: string;
    disputed: boolean;
    latestRequestSubmissionTime: string;
    metadata: LItemMetadata;
    requests: Request[];
    status: string;
}
