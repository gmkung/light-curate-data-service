// Main entry point for the package

import * as klerosIpfsUtils from "./ipfs";
import { LightCurateRegistry } from "./web3";
import * as graphUtils from "./graph";

// Export the main classes
export { LightCurateRegistry };

// Export IPFS utilities
export const ipfs = klerosIpfsUtils;

// Export Graph utilities
export const graph = graphUtils;

// Re-export specific functions for convenience
export const { uploadToIPFS, uploadJSONToIPFS, fetchFromIPFS } =
  klerosIpfsUtils;
export const {
  fetchItems,
  fetchItemsById,
  fetchItemsByStatus,
  clearItemsCache,
} = graphUtils;

// Export constants
export const SUPPORTED_CHAINS = {
  ETHEREUM_MAINNET: 1,
  GNOSIS_CHAIN: 100,
} as const;

export type SupportedChainId =
  (typeof SUPPORTED_CHAINS)[keyof typeof SUPPORTED_CHAINS];

// Export types
export * from "./types";
