# LightGeneralizedTCR

A JavaScript/TypeScript library for interacting with the LightGeneralizedTCR smart contract, enabling decentralized token curated registries on Ethereum and Gnosis Chain.

## Installation

```bash
npm install light-curate-data-service
```

or

```bash
yarn add light-curate-data-service
```

## Quick Start

### Initialize the Registry

```typescript
import { LightCurateRegistry, SUPPORTED_CHAINS } from "light-curate-data-service";

// Initialize with contract address and chain ID
const registry = new LightCurateRegistry(
  "0x1234...5678", // Your registry contract address
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
```

### Fetch Registry Items

```typescript
import { fetchItems } from "light-curate-data-service";

// Fetch items with pagination support
const { items, stats } = await fetchItems(
  registryAddress,
  SUPPORTED_CHAINS.ETHEREUM_MAINNET,
  {
    onProgress: ({ loaded, total }) => {
      console.log(`Loaded ${loaded} items${total ? ` of ${total}` : ""}`);
    },
    maxBatches: 5, // Limit initial load for pagination
  }
);

// Display items in your UI
items.forEach((item) => {
  console.log(`Item ${item.itemID}: Status = ${item.status}`);
  console.log(`Metadata:`, item.metadata.props);
});
```

## Implementation Guide: Building a Curated Registry Frontend

This section provides a comprehensive guide on how to implement a frontend for a decentralized token curated registry.

### Setup and Initialization

Start by initializing the library with your registry address and chain ID:

```typescript
import { 
  LightCurateRegistry, 
  SUPPORTED_CHAINS, 
  fetchItems 
} from "light-curate-data-service";

// Initialize with contract address and chain ID
const registry = new LightCurateRegistry(
  "0x1234...5678", // Your registry contract address
  SUPPORTED_CHAINS.ETHEREUM_MAINNET
);
```

### Data Retrieval and Display

Use the GraphQL functions to fetch and display registry items:

```typescript
// Fetch items with pagination support
const { items, stats } = await fetchItems(
  registryAddress,
  SUPPORTED_CHAINS.ETHEREUM_MAINNET,
  {
    onProgress: ({ loaded, total }) => {
      console.log(`Loaded ${loaded} items${total ? ` of ${total}` : ""}`);
      // Update your loading UI
    },
    maxBatches: 5, // Limit initial load, implement "load more" functionality
  }
);

// Display items in your UI
items.forEach((item) => {
  // Each item.metadata.props contains an array of property objects with the structure:
  // {
  //   description: string;    // Description of the property
  //   isIdentifier: boolean;  // Whether this property uniquely identifies the item
  //   label: string;         // Display label for the property
  //   type: string;          // Data type of the property
  //   value: string;         // The actual value
  // }
  const props = item.metadata.props;

  // Example: Display item in a card or list
  renderItemCard({
    id: item.itemID,
    status: item.status,
    properties: props,
    disputed: item.disputed,
    timestamp: new Date(parseInt(item.latestRequestSubmissionTime) * 1000),
  });
});
```

The `metadata.props` array contains structured data about each item in your registry. Each property object in the array follows this structure:
- `description`: A detailed description of what the property represents
- `isIdentifier`: Boolean flag indicating if this property uniquely identifies the item
- `label`: Human-readable label for displaying the property
- `type`: The data type of the property value
- `value`: The actual value of the property

For example, a registry item might have props like this:
```typescript
props: [
  {
    description: "The name of the project",
    isIdentifier: true,
    label: "Project Name",
    type: "string",
    value: "My Awesome Project"
  },
  {
    description: "Project's GitHub URL",
    isIdentifier: false,
    label: "GitHub URL",
    type: "url",
    value: "https://github.com/example/project"
  }
]
```

### Item Lifecycle Management

#### 1. Submitting New Entries

Allow users to submit new entries to the registry:

```typescript
// First upload metadata to IPFS
const ipfsPath = await uploadJSONToIPFS({
  title: "New Item",
  description: "Description of the item",
  // Additional metadata specific to your registry
});

// Then submit to the registry
const txHash = await registry.submitToRegistry(ipfsPath);
```

#### 2. Challenging Pending Requests

When an item has status `RegistrationRequested` or `ClearingRequested`, it can be challenged:

```typescript
// First upload evidence to IPFS
const evidenceIpfsPath = await uploadJSONToIPFS({
  title: "Challenge Evidence",
  description: "Reasons for challenging this submission",
});

// Then challenge the request
const txHash = await registry.challengeRequest(itemID, evidenceIpfsPath);
```

#### 3. Submitting Evidence

During the challenge period, both parties can submit evidence:

```typescript
// Upload evidence to IPFS
const evidenceIpfsPath = await uploadJSONToIPFS({
  title: "Additional Evidence",
  description: "Supporting information for my case",
});

// Submit evidence to the contract
await registry.submitEvidence(itemID, evidenceIpfsPath);
```

In your item detail view, display all evidence (no need to use fetchItemsById again if the data was already cached in the frontend from previous fetchItems calls):

```typescript
// If you need to fetch a specific item's details including evidence
const { items } = await fetchItemsById(
  registryAddress, 
  [itemID], 
  chainId
);
const item = items[0];

// Display evidence in your UI 
if (item.requests[0].evidenceGroup) {
  item.requests[0].evidenceGroup.evidences.forEach((evidence) => {
    // Fetch and parse evidence from IPFS
    const evidenceData = await fetchFromIPFS(evidence.URI);
    
    renderEvidence({
      title: evidenceData.title,
      description: evidenceData.description,
      submitter: evidence.party,
      timestamp: new Date(parseInt(evidence.timestamp) * 1000),
    });
  });
}

**Note on Currency Units**: When using chainId=1 (Ethereum Mainnet), all currency values are in ETH. When using chainId=100 (Gnosis Chain), all currency values are in xDai.
```

#### 4. Dispute Resolution

When an item is challenged, its status changes to `disputed: true`. The dispute is resolved by Kleros jurors (outside your interface).

#### 5. Appeal Process

After initial ruling, check if the dispute is appealable:

```typescript
// In your item detail component
function checkAppealStatus(item) {
  const request = item.requests[0];
  const currentRound = request.rounds[request.rounds.length - 1];
  
  // Check if in appeal period and not already appealed
  const now = Math.floor(Date.now() / 1000);
  const appealPeriodStart = parseInt(currentRound.appealPeriodStart);
  const appealPeriodEnd = parseInt(currentRound.appealPeriodEnd);
  
  if (
    appealPeriodStart > 0 && 
    appealPeriodEnd > 0 && 
    now >= appealPeriodStart && 
    now <= appealPeriodEnd && 
    !currentRound.appealed
  ) {
    // Show appeal UI
    showAppealInterface(item.itemID);
  }
}

async function showAppealInterface(itemID) {
  // Get appeal costs
  const appealCost = await registry.getAppealCost(itemID);
  
  // Get funding status
  const fundingStatus = await registry.getAppealFundingStatus(itemID);
  
  // Render appeal UI with this information
  renderAppealUI({
    itemID,
    appealCost,
    fundingStatus,
    onFundRequester: (amount) => fundAppeal(itemID, 1, amount),
    onFundChallenger: (amount) => fundAppeal(itemID, 2, amount),
  });
}

async function fundAppeal(itemID, side, amount) {
  try {
    const txHash = await registry.fundAppeal(itemID, 0, side, amount);
    showSuccess(`Appeal funded! Transaction: ${txHash}`);
    
    // Refresh funding status
    const newStatus = await registry.getAppealFundingStatus(itemID);
    updateAppealUI(newStatus);
  } catch (error) {
    showError(registry.handleWeb3Error(error));
  }
}
```

### Complete User Flow

1. **Browse Registry**: Users view the list of items with their status and metadata
2. **Submit Items**: Users can submit new items to the registry
3. **Challenge Items**: Users can challenge pending registration or removal requests
4. **Submit Evidence**: Both parties can submit evidence to support their case
5. **Monitor Disputes**: Users can track the status of disputed items
6. **Appeal Rulings**: Users can fund appeals for disputes they disagree with
7. **View Final Results**: Once resolved, items are either registered or removed

This workflow creates a complete decentralized curation system where the community collectively determines what items should be included in the registry.

## Appeal Functions

The LightCurateRegistry provides several functions to interact with the appeal process for disputed items.

### Getting Appeal Costs

```typescript
async getAppealCost(
  itemID: string,
  requestID: number = 0
): Promise<{
  requesterAppealFee: string;
  challengerAppealFee: string;
  requesterAppealFeeWei: string;
  challengerAppealFeeWei: string;
  currentRuling: number;
}>
```

Gets the cost to appeal a disputed item. This includes separate costs for the requester and challenger based on the current ruling.

**Parameters:**

- `itemID`: The ID of the item in the registry
- `requestID`: The ID of the request (usually 0 for new items)

**Returns:**

- `requesterAppealFee`: The appeal fee for the requester in ETH
- `challengerAppealFee`: The appeal fee for the challenger in ETH
- `requesterAppealFeeWei`: The appeal fee for the requester in Wei
- `challengerAppealFeeWei`: The appeal fee for the challenger in Wei
- `currentRuling`: The current ruling (0 = None, 1 = Requester, 2 = Challenger)

**Note**: On Ethereum Mainnet (chainId=1), fees are in ETH. On Gnosis Chain (chainId=100), fees are in xDai.

**Example:**

```typescript
const appealCost = await registry.getAppealCost(itemID);
console.log(`Requester appeal fee: ${appealCost.requesterAppealFee} ETH`);
console.log(`Challenger appeal fee: ${appealCost.challengerAppealFee} ETH`);
```

### Getting Appeal Funding Status

```typescript
async getAppealFundingStatus(
  itemID: string,
  requestID: number = 0
): Promise<{
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
}>
```

Gets the current funding status of an appeal for a disputed item.

**Parameters:**

- `itemID`: The ID of the item in the registry
- `requestID`: The ID of the request (usually 0 for new items)

**Returns:**

- `requesterFunded`: Whether the requester side is fully funded
- `challengerFunded`: Whether the challenger side is fully funded
- `requesterAmountPaid`: Amount already paid by the requester in ETH
- `challengerAmountPaid`: Amount already paid by the challenger in ETH
- `requesterRemainingToFund`: Remaining amount needed from the requester in ETH
- `challengerRemainingToFund`: Remaining amount needed from the challenger in ETH
- `appealed`: Whether the appeal has been created
- `currentRuling`: The current ruling (0 = None, 1 = Requester, 2 = Challenger)
- `roundIndex`: The current round index (0-based)

**Example:**

```typescript
const fundingStatus = await registry.getAppealFundingStatus(itemID);

if (!fundingStatus.requesterFunded) {
  console.log(
    `Requester needs ${fundingStatus.requesterRemainingToFund} ETH more`
  );
}

if (!fundingStatus.challengerFunded) {
  console.log(
    `Challenger needs ${fundingStatus.challengerRemainingToFund} ETH more`
  );
}
```

### Funding an Appeal

```typescript
async fundAppeal(
  itemID: string,
  requestID: number = 0,
  side: 1 | 2,
  amount?: string
): Promise<string>
```

Funds an appeal for a specific side. This function requires a browser environment with MetaMask or similar wallet.

**Parameters:**

- `itemID`: The ID of the item in the registry
- `requestID`: The ID of the request (usually 0 for new items)
- `side`: The side to fund (1 = Requester, 2 = Challenger)
- `amount`: Optional amount to contribute in ETH. If not specified, will fund the remaining required amount.

**Returns:**

- Transaction hash of the appeal funding transaction

**Example:**

```typescript
// Fund the requester side with 0.1 ETH
const txHash = await registry.fundAppeal(itemID, 0, 1, "0.1");
console.log(`Appeal funded! Transaction: ${txHash}`);

// Fund the challenger side with the full remaining amount
const txHash = await registry.fundAppeal(itemID, 0, 2);
console.log(`Appeal fully funded! Transaction: ${txHash}`);
```

## Appeal Process Overview

When an item is disputed in the Light Curate registry, it enters the arbitration process. After the initial ruling, either party can appeal by funding their side of the appeal:

1. Check if an item is disputed using `getItemInfo()`
2. If disputed, get the appeal costs using `getAppealCost()`
3. Check the current funding status using `getAppealFundingStatus()`
4. Fund your side of the appeal using `fundAppeal()`
5. Once both sides are fully funded, the appeal will be created automatically

Note that appeal fees are typically higher for the side that lost the initial ruling, as determined by the stake multipliers in the contract.

## API Reference

### Package Exports

```typescript
import {
  // Main class
  LightCurateRegistry,
  
  // Constants
  SUPPORTED_CHAINS,
  
  // Types
  SupportedChainId,
  ItemStatus,
  DepositInfo,
  
  // Graph functions
  fetchItems,
  fetchItemsById,
  fetchItemsByStatus,
  clearItemsCache,
  
  // IPFS functions
  uploadToIPFS,
  uploadJSONToIPFS,
  fetchFromIPFS,
} from "light-curate-data-service";
```

### IPFS Utilities

```typescript
// Upload raw data to IPFS
const ipfsPath = await uploadToIPFS(buffer, "filename.txt");

// Upload JSON data to IPFS (automatically stringifies)
const ipfsPath = await uploadJSONToIPFS({
  title: "My Evidence",
  description: "This is supporting evidence",
});

// Fetch data from IPFS
const data = await fetchFromIPFS(ipfsPath);
```

### The Graph API

```typescript
// Fetch all items from a registry
const { items, stats } = await fetchItems(
  registryAddress,
  SUPPORTED_CHAINS.ETHEREUM_MAINNET
);

// Get a single item by ID
const { items } = await fetchItemsById(
  registryAddress,
  [itemID],
  SUPPORTED_CHAINS.GNOSIS_CHAIN
);
const item = items[0];

// Get items by status
const { items: registeredItems } = await fetchItemsByStatus(
  registryAddress,
  ["Registered"],
  SUPPORTED_CHAINS.ETHEREUM_MAINNET
);

// Clear cache
clearItemsCache(registryAddress, SUPPORTED_CHAINS.ETHEREUM_MAINNET);
```

### Evidence Data Structure

Each item's request includes an `evidenceGroup` containing an array of `evidences`. Evidence entries contain:

- **party**: The Ethereum address that submitted the evidence
- **URI**: The IPFS URI pointing to the JSON content of the evidence
- **timestamp**: When the evidence was submitted
- **id**: Unique identifier for the evidence

### Supported Chains

The library currently supports the following chains:

- Ethereum Mainnet (Chain ID: 1)
- Gnosis Chain (Chain ID: 100)

These are exposed as constants via the `SUPPORTED_CHAINS` object and as a TypeScript type via `SupportedChainId`.

**Important**: Currency units depend on the chain being used. On Ethereum Mainnet, all currency values are in ETH. On Gnosis Chain, all currency values are in xDai. This applies to all functions that return or accept currency values, including deposit calculations, appeal costs, and funding functions.

## License

MIT
