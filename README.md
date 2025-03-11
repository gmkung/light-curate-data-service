# LightGeneralizedTCR

A JavaScript/TypeScript library for interacting with the LightGeneralizedTCR smart contract.

## Installation

```bash
npm install light-curate-data-service
```

or

```bash
yarn add light-curate-data-service
```

## Exports

The package exports the following:

### Main Class

```typescript
import {
  LightCurateRegistry,
  SUPPORTED_CHAINS,
  SupportedChainId,
} from "light-curate-data-service";

// Initialize with contract address and chain ID
const registry = new LightCurateRegistry(
  contractAddress,
  SUPPORTED_CHAINS.ETHEREUM_MAINNET
);

// Or for Gnosis Chain
const gnosisRegistry = new LightCurateRegistry(
  contractAddress,
  SUPPORTED_CHAINS.GNOSIS_CHAIN
);

// You can also use the SupportedChainId type for type safety
function loadRegistry(address: string, chainId: SupportedChainId) {
  return new LightCurateRegistry(address, chainId);
}
```

### IPFS Utilities

```typescript
// As a namespace
import { ipfs } from "light-curate-data-service";
await ipfs.uploadJSONToIPFS(data);

// Or individual functions
import {
  uploadToIPFS,
  uploadJSONToIPFS,
  fetchFromIPFS,
} from "light-curate-data-service";
await uploadJSONToIPFS(data);
```

### The Graph API

```typescript
// As a namespace
import { graph } from "light-curate-data-service";

// Fetch all items from a registry
const { items, stats } = await graph.fetchItems(
  registryAddress,
  SUPPORTED_CHAINS.GNOSIS_CHAIN
);

// Fetch items with progress reporting and filters
const { items, stats } = await graph.fetchItems(
  registryAddress,
  SUPPORTED_CHAINS.ETHEREUM_MAINNET,
  {
    onProgress: ({ loaded, total }) => {
      console.log(`Loaded ${loaded} items${total ? ` of ${total}` : ""}`);
    },
    forceRefresh: true, // Bypass cache
    maxBatches: 10, // Limit number of batches
    filters: {
      // Apply filters
      status: ["Registered", "ClearingRequested"],
    },
  }
);

// Get a single item by ID
const item = await graph.fetchItemById(
  registryAddress,
  itemID,
  SUPPORTED_CHAINS.GNOSIS_CHAIN
);

// Get items by status
const registeredItems = await graph.fetchItemsByStatus(
  registryAddress,
  ["Registered"],
  SUPPORTED_CHAINS.ETHEREUM_MAINNET
);

// Clear cache
graph.clearItemsCache(registryAddress, SUPPORTED_CHAINS.ETHEREUM_MAINNET);
```

### Types

```typescript
import {
  ItemStatus,
  DepositInfo,
  SupportedChainId,
} from "light-curate-data-service";

// ItemStatus enum:
// - Absent = 0
// - Registered = 1
// - RegistrationRequested = 2
// - ClearingRequested = 3

// SupportedChainId is a union type of supported chain IDs (1 | 100)
```

## Basic Usage

### Using LightCurateRegistry

```typescript
import {
  LightCurateRegistry,
  SUPPORTED_CHAINS,
} from "light-curate-data-service";

// Initialize with contract address and chain ID
const registry = new LightCurateRegistry(
  contractAddress,
  SUPPORTED_CHAINS.ETHEREUM_MAINNET
);

// Connect wallet and switch to the correct chain
try {
  await registry.switchToCorrectChain();
  const account = await registry.connectWallet();
  console.log("Connected account:", registry.formatWalletAddress(account));
} catch (error) {
  console.error(registry.handleWeb3Error(error));
}

// Get challenge period and deposit information
const challengePeriodDays = await registry.getChallengePeriodDurationInDays();
const depositInfo = await registry.getSubmissionDepositAmount();
console.log("Challenge period:", challengePeriodDays, "days");
console.log("Required deposit:", depositInfo.depositAmount, "ETH");
console.log("Deposit breakdown:", depositInfo.breakdown);

// Submit to registry
try {
  const txHash = await registry.submitToRegistry(ipfsPath);
  console.log("Submission transaction:", txHash);
} catch (error) {
  console.error(registry.handleWeb3Error(error));
}

// Remove an item
try {
  const txHash = await registry.removeItem(itemID, evidenceIPFSPath);
  console.log("Removal transaction:", txHash);
} catch (error) {
  console.error(registry.handleWeb3Error(error));
}

// Challenge a request
try {
  const txHash = await registry.challengeRequest(itemID, evidenceIPFSPath);
  console.log("Challenge transaction:", txHash);
} catch (error) {
  console.error(registry.handleWeb3Error(error));
}
```

### Using IPFS Utilities

```typescript
import { uploadJSONToIPFS, fetchFromIPFS } from "light-curate-data-service";

// Upload JSON data
const ipfsPath = await uploadJSONToIPFS({
  title: "My Item",
  description: "Description",
  metadata: {
    // Additional metadata
  },
});

// Fetch data
const data = await fetchFromIPFS(ipfsPath);
```

### Using The Graph API

```typescript
import { graph, SUPPORTED_CHAINS } from "light-curate-data-service";

// Fetch all items from a registry with pagination and caching
async function loadRegistryItems(registryAddress) {
  const { items, stats } = await graph.fetchItems(
    registryAddress,
    SUPPORTED_CHAINS.GNOSIS_CHAIN,
    {
      onProgress: ({ loaded, total }) => {
        // Update UI with progress
        updateLoadingProgress(loaded, total);
      },
      maxBatches: 10, // Limit number of batches for faster initial load
    }
  );

  console.log(`Loaded ${items.length} items in ${stats.batches} batches`);
  return items;
}

// Search for specific items by ID
async function findItemById(registryAddress, itemId) {
  const item = await graph.fetchItemById(
    registryAddress,
    itemId,
    SUPPORTED_CHAINS.GNOSIS_CHAIN
  );

  if (item) {
    console.log(`Found item: ${item.itemID}`);
    return item;
  } else {
    console.log("Item not found");
    return null;
  }
}

// Filter items by status
async function getItemsByStatus(registryAddress, status) {
  const filteredItems = await graph.fetchItemsByStatus(
    registryAddress,
    status,
    SUPPORTED_CHAINS.GNOSIS_CHAIN
  );

  console.log(`Found ${filteredItems.length} items with status: ${status}`);
  return filteredItems;
}

// Clear cache when data might be stale
function refreshData(registryAddress) {
  graph.clearItemsCache(registryAddress, SUPPORTED_CHAINS.GNOSIS_CHAIN);
  return loadRegistryItems(registryAddress);
}
```

## Supported Chains

The library currently supports the following chains:

- Ethereum Mainnet (Chain ID: 1)
- Gnosis Chain (Chain ID: 100)

These are exposed as constants via the `SUPPORTED_CHAINS` object and as a TypeScript type via `SupportedChainId`.

## API Reference

### LightCurateRegistry Methods

#### Wallet Management

- `connectWallet()`: Connects to user's Ethereum wallet and ensures correct chain
- `getCurrentAccount()`: Gets currently connected account
- `switchToCorrectChain()`: Switches to the correct chain based on initialization
- `formatWalletAddress(address)`: Formats wallet address for display
- `getChainId()`: Returns the chain ID used for initialization

#### Registry Information

- `getChallengePeriodDurationInDays()`: Gets challenge period duration
- `getArbitrationCost()`: Gets arbitration cost information
- `getSubmissionDepositAmount()`: Gets deposit required for submission
- `getSubmissionChallengeDepositAmount()`: Gets deposit for challenging submissions
- `getRemovalDepositAmount()`: Gets deposit required for removal
- `getRemovalChallengeDepositAmount()`: Gets deposit for challenging removals

#### Registry Actions

- `submitToRegistry(ipfsPath)`: Submits an item to the registry
- `removeItem(itemID, evidence)`: Removes an item from the registry
- `challengeRequest(itemID, evidence)`: Challenges a request

#### Error Handling

- `handleWeb3Error(error)`: Formats Web3 errors for user display

### The Graph API Methods

#### Data Fetching

- `fetchItems(registryAddress, chainId, options)`: Fetches all items with pagination and caching
- `fetchItemsBatch(registryAddress, chainId, lastTimestamp, customSubgraphUrl, signal, filters)`: Fetches a single batch of items
- `fetchItemById(registryAddress, itemID, chainId, options)`: Fetches a single item by ID
- `fetchItemsByStatus(registryAddress, status, chainId, options)`: Fetches items by status

#### Cache Management

- `clearItemsCache(registryAddress, chainId, filters)`: Clears cache entries matching the parameters

## Documentation

For detailed API documentation and examples, visit [documentation link].

## License

MIT
