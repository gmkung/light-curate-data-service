import { GraphQLResponse, LItem } from "./types";
import { toast } from "sonner";
import { SupportedChainId } from "./index";

// Constants
const BATCH_SIZE = 1000;

// Cache for GraphQL responses
const itemsCache = new Map<string, LItem[]>();

// Default subgraph URLs by chain
const SUBGRAPH_URLS = {
  1: "https://gateway.thegraph.com/api/73380b22a17017c081123ec9c0e34677/subgraphs/id/A5oqWboEuDezwqpkaJjih4ckGhoHRoXZExqUbja2k1NQ", // Ethereum Mainnet
  100: "https://gateway.thegraph.com/api/73380b22a17017c081123ec9c0e34677/subgraphs/id/9hHo5MpjpC1JqfD3BsgFnojGurXRHTrHWcUcZPPCo6m8", // Gnosis Chain
};

// Common item fields to query
const ITEM_FIELDS = `
  __typename
  data
  itemID
  disputed
  latestRequestSubmissionTime
  metadata {
    __typename
    props {
      __typename
      description
      isIdentifier
      label
      type
      value
    }
  }
  requests {
    __typename
    challenger
    deposit
    disputeID
    disputed
    requester
    resolutionTime
    resolved
    requestType
    rounds {
      __typename
      appealed
      amountPaidChallenger
      amountPaidRequester
      appealPeriodEnd
      appealPeriodStart
      hasPaidChallenger
      hasPaidRequester
      ruling
    }
    submissionTime
    evidenceGroup {
      id
      evidences {
      id
      URI
      party
      timestamp  
      }
    }
  }
  status
`;

/**
 * Creates a GraphQL query for fetching items with filters
 */
function createItemsQuery(
  registryAddress: string,
  lastTimestamp?: number,
  filters?: Record<string, string[]>
) {
  // Build where clause
  const whereConditions = [`registry: "${registryAddress.toLowerCase()}"`];

  // Add timestamp for pagination
  if (lastTimestamp) {
    whereConditions.push(`latestRequestSubmissionTime_lt: ${lastTimestamp}`);
  }

  // Add filter conditions
  if (filters) {
    Object.entries(filters).forEach(([key, values]) => {
      if (values && values.length > 0) {
        whereConditions.push(
          `${key}_in: [${values.map((v) => `"${v}"`).join(", ")}]`
        );
      }
    });
  }

  return `
    query GetItems {
      litems(
        first: ${BATCH_SIZE}
        orderBy: latestRequestSubmissionTime
        orderDirection: desc
        where: { ${whereConditions.join(", ")} }
      ) {
        ${ITEM_FIELDS}
      }
    }
  `;
}

/**
 * Generates a cache key based on parameters
 */
function generateCacheKey(
  chainId: SupportedChainId,
  registryAddress: string,
  filters?: Record<string, string[]>
): string {
  let key = `${chainId}-${registryAddress.toLowerCase()}`;

  if (filters && Object.keys(filters).length > 0) {
    const filterString = Object.entries(filters)
      .sort()
      .map(([key, values]) => `${key}:${(values || []).sort().join(",")}`)
      .join(";");

    key += `-${filterString}`;
  }

  return key;
}

/**
 * Makes a GraphQL request to fetch items
 */
async function makeGraphQLRequest(
  url: string,
  query: string,
  signal?: AbortSignal
): Promise<GraphQLResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Network response was not ok: ${response.statusText}`);
  }

  const result = await response.json();

  if (result.errors) {
    console.error("GraphQL errors:", result.errors);
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }

  return result;
}

/**
 * Fetches a single batch of items
 */
export async function fetchItemsBatch(
  registryAddress: string,
  chainId: SupportedChainId = 1,
  lastTimestamp?: number,
  customSubgraphUrl?: string,
  signal?: AbortSignal,
  filters?: Record<string, string[]>
): Promise<{ items: LItem[]; hasMore: boolean }> {
  try {
    const subgraphUrl = customSubgraphUrl || SUBGRAPH_URLS[chainId];
    if (!subgraphUrl) {
      throw new Error(`No subgraph URL available for chain ID: ${chainId}`);
    }

    const query = createItemsQuery(registryAddress, lastTimestamp, filters);
    const result = await makeGraphQLRequest(subgraphUrl, query, signal);

    if (!result.data || !Array.isArray(result.data.litems)) {
      throw new Error("Received invalid data format");
    }

    return {
      items: result.data.litems,
      hasMore: result.data.litems.length === BATCH_SIZE,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("Fetch aborted");
      return { items: [], hasMore: false };
    }

    console.error("Error fetching batch:", error);
    if (typeof toast !== "undefined") {
      toast.error("Failed to load items. Please try again later.");
    }
    throw error;
  }
}

/**
 * Fetches all items with pagination and caching
 */
export async function fetchItems(
  registryAddress: string,
  chainId: SupportedChainId = 1,
  options: {
    customSubgraphUrl?: string;
    forceRefresh?: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: { loaded: number; total?: number }) => void;
    maxBatches?: number;
    filters?: Record<string, string[]>;
  } = {}
): Promise<{ items: LItem[]; stats: { batches: number; total: number } }> {
  const {
    customSubgraphUrl,
    signal,
    onProgress,
    forceRefresh = false,
    maxBatches = Infinity,
    filters,
  } = options;

  // Check cache
  const cacheKey = generateCacheKey(chainId, registryAddress, filters);

  if (!forceRefresh && itemsCache.has(cacheKey)) {
    const cachedItems = itemsCache.get(cacheKey) || [];
    return {
      items: cachedItems,
      stats: { batches: 0, total: cachedItems.length },
    };
  }

  try {
    let allItems: LItem[] = [];
    let lastTimestamp: number | undefined = undefined;
    let batchCount = 0;

    // Fetch batches with pagination
    while (batchCount < maxBatches) {
      if (signal?.aborted) {
        throw new Error("Operation aborted");
      }

      const { items, hasMore } = await fetchItemsBatch(
        registryAddress,
        chainId,
        lastTimestamp,
        customSubgraphUrl,
        signal,
        filters
      );

      batchCount++;
      allItems = [...allItems, ...items];

      // Report progress
      if (onProgress) {
        onProgress({
          loaded: allItems.length,
          total: hasMore ? undefined : allItems.length,
        });
      }

      // Check if we need to fetch more
      if (!hasMore || items.length === 0) {
        break;
      }

      // Update pagination cursor
      const lastItem = items[items.length - 1];
      lastTimestamp = parseInt(lastItem.latestRequestSubmissionTime);
    }

    // Update cache
    itemsCache.set(cacheKey, allItems);

    return {
      items: allItems,
      stats: { batches: batchCount, total: allItems.length },
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.log("Fetch aborted");
      return { items: [], stats: { batches: 0, total: 0 } };
    }

    console.error("Error fetching items:", error);
    if (typeof toast !== "undefined") {
      toast.error("Failed to load all items. Please try again later.");
    }
    return { items: [], stats: { batches: 0, total: 0 } };
  }
}

/**
 * Fetches multiple items by IDs
 * @param registryAddress The address of the registry contract
 * @param itemID Array of item IDs
 * @param chainId The chain ID (1 for Ethereum Mainnet, 100 for Gnosis Chain)
 * @param options Additional options for fetching
 * @returns Object containing items array and stats
 */
export async function fetchItemsById(
  registryAddress: string,
  itemID: string[],
  chainId: SupportedChainId = 1,
  options: {
    customSubgraphUrl?: string;
    forceRefresh?: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: { loaded: number; total?: number }) => void;
  } = {}
): Promise<{ items: LItem[]; stats: { batches: number; total: number } }> {
  const result = await fetchItems(registryAddress, chainId, {
    ...options,
    forceRefresh: true,
    filters: { itemID },
  });

  return result;
}

/**
 * Fetches items by status
 */
export async function fetchItemsByStatus(
  registryAddress: string,
  status: string[],
  chainId: SupportedChainId = 1,
  options: {
    customSubgraphUrl?: string;
    forceRefresh?: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: { loaded: number; total?: number }) => void;
  } = {}
): Promise<{ items: LItem[]; stats: { batches: number; total: number } }> {
  const result = await fetchItems(registryAddress, chainId, {
    ...options,
    forceRefresh: true,
    filters: { status },
  });

  return result;
}

/**
 * Clears the items cache
 * @param registryAddress Optional registry address
 * @param chainId Optional chain ID
 * @param filters Optional filters to further narrow cache entries to clear
 */
export function clearItemsCache(
  registryAddress?: string,
  chainId?: SupportedChainId,
  filters?: Record<string, string[]>
): void {
  // Clear entire cache if no parameters
  if (!registryAddress && !chainId && !filters) {
    itemsCache.clear();
    return;
  }

  // Only clear specific cache entries when all required parameters are provided
  if (registryAddress && chainId) {
    const cacheKey = generateCacheKey(chainId, registryAddress, filters);
    itemsCache.delete(cacheKey);
  }

  // If parameters are missing, do nothing
}
