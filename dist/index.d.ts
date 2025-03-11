import * as klerosIpfsUtils from "./ipfs";
import { LightCurateRegistry } from "./web3";
export { LightCurateRegistry };
export declare const ipfs: typeof klerosIpfsUtils;
export declare const uploadToIPFS: (data: Uint8Array, fileName: string) => Promise<string>, uploadJSONToIPFS: (data: any) => Promise<string>, fetchFromIPFS: typeof klerosIpfsUtils.fetchFromIPFS;
export declare const SUPPORTED_CHAINS: {
    readonly ETHEREUM_MAINNET: 1;
    readonly GNOSIS_CHAIN: 100;
};
export type SupportedChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];
export * from "./types";
