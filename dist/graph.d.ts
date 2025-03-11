import { LItem } from "./types";
import { SupportedChainId } from "./index";
/**
 * Fetches a single batch of items
 */
export declare function fetchItemsBatch(registryAddress: string, chainId?: SupportedChainId, lastTimestamp?: number, customSubgraphUrl?: string, signal?: AbortSignal, filters?: Record<string, string[]>): Promise<{
    items: LItem[];
    hasMore: boolean;
}>;
/**
 * Fetches all items with pagination and caching
 */
export declare function fetchItems(registryAddress: string, chainId?: SupportedChainId, options?: {
    customSubgraphUrl?: string;
    forceRefresh?: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: {
        loaded: number;
        total?: number;
    }) => void;
    maxBatches?: number;
    filters?: Record<string, string[]>;
}): Promise<{
    items: LItem[];
    stats: {
        batches: number;
        total: number;
    };
}>;
/**
 * Fetches multiple items by IDs
 * @param registryAddress The address of the registry contract
 * @param itemID Array of item IDs
 * @param chainId The chain ID (1 for Ethereum Mainnet, 100 for Gnosis Chain)
 * @param options Additional options for fetching
 * @returns Object containing items array and stats
 */
export declare function fetchItemsById(registryAddress: string, itemID: string[], chainId?: SupportedChainId, options?: {
    customSubgraphUrl?: string;
    forceRefresh?: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: {
        loaded: number;
        total?: number;
    }) => void;
}): Promise<{
    items: LItem[];
    stats: {
        batches: number;
        total: number;
    };
}>;
/**
 * Fetches items by status
 */
export declare function fetchItemsByStatus(registryAddress: string, status: string[], chainId?: SupportedChainId, options?: {
    customSubgraphUrl?: string;
    forceRefresh?: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: {
        loaded: number;
        total?: number;
    }) => void;
}): Promise<{
    items: LItem[];
    stats: {
        batches: number;
        total: number;
    };
}>;
/**
 * Clears the items cache
 * @param registryAddress Optional registry address
 * @param chainId Optional chain ID
 * @param filters Optional filters to further narrow cache entries to clear
 */
export declare function clearItemsCache(registryAddress?: string, chainId?: SupportedChainId, filters?: Record<string, string[]>): void;
