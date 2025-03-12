
# Prompt 1 : Display Items from Light Curate Registry

## Setup

This frontend is structured around the light-curate-data-service NPM package, which retrieves data from and interacts with a Kleros Curate smart contract.

```bash
yarn add light-curate-data-service
```

```typescript
import { fetchItems, SUPPORTED_CHAINS } from "light-curate-data-service";

const REGISTRY_ADDRESS = "0xda03509bb770061a61615ad8fc8e1858520ebd86"; // store as global constant for reference from different parts of the code
const CHAIN_ID = SUPPORTED_CHAINS.ETHEREUM_MAINNET; // 1
```

## Fetch Data

```typescript
const { items, stats } = await fetchItems(REGISTRY_ADDRESS, CHAIN_ID, {
  onProgress: ({ loaded, total }) => {
    console.log(`Loaded ${loaded} items${total ? ` of ${total}` : ""}`);
  },
  maxBatches: 100, // Optional: Limit initial load for pagination
});
```

## Data Structure

Each item in the returned `items` array contains:

- `itemID`: Unique identifier
- `status`: Current status of the item ("Absent" | "RegistrationRequested" | "Registered" | "ClearingRequested" | "Challenged")
- `disputed`: Boolean flag if item is disputed
- `latestRequestSubmissionTime`: Unix timestamp of latest activity
- `metadata.props`: Array of structured properties:
  ```typescript
  // Each property in the metadata.props array follows this structure:
  {
    description: string;    // Property description (e.g., "Project name", "Repository URL")
    isIdentifier: boolean; // If true, this property uniquely identifies the item
    label: string;         // Display label shown in UI
    type: string;         // Data type (e.g., "text", "link", etc.)
    value: string;        // Actual value of the property
  }
  ```
- `requests`: Array of request objects:
  ```typescript
  // Each request contains:
  {
    challenger: string;    // Address of the challenger if disputed
    deposit: string;      // Deposit amount in Wei
    disputeID: string;    // ID of the dispute if challenged
    disputed: boolean;    // Whether this request is disputed
    requester: string;    // Address that made the request
    resolutionTime: string; // When the request was resolved (Unix timestamp)
    resolved: boolean;    // Whether the request is resolved
    requestType: string;  // Type of request
    evidenceGroup: {      // Evidence submitted for this request
      id: string;
      evidences: [{
        id: string;      // Unique identifier for evidence
        URI: string;     // IPFS path to evidence content
        party: string;   // Address that submitted evidence
        timestamp: string; // When evidence was submitted (Unix timestamp)
      }]
    }
    rounds: [{           // Appeal rounds if disputed
      appealed: boolean;
      amountPaidChallenger: string; // Appeal fees paid by challenger
      amountPaidRequester: string;  // Appeal fees paid by requester
      appealPeriodEnd: string;      // When appeal period ends (Unix timestamp)
      appealPeriodStart: string;    // When appeal period starts (Unix timestamp)
      hasPaidChallenger: boolean;   // If challenger has fully funded appeal
      hasPaidRequester: boolean;    // If requester has fully funded appeal
      ruling: number;               // None = No ruling yet, 0 = Refuse to Arbitrate, 1 = Accept, 2 = Reject
    }]
  }
  ```

## Display Requirements

1. Create a grid/list of item cards
2. For each item, show:
   - Status badge (prominent)
   - Identifier properties (from props where isIdentifier=true)
   - Submission timestamp (formatted)
   - Disputed status indicator if applicable
3. Make cards clickable for detailed view
4. Support pagination if maxBatches was used

## Example Card Layout

```typescript
function ItemCard({ item }) {
  const identifiers = item.metadata.props.filter(p => p.isIdentifier);
  const timestamp = new Date(parseInt(item.latestRequestSubmissionTime) * 1000);

  return (
    <Card onClick={() => showDetails(item.itemID)}>
      <StatusBadge>{item.status}</StatusBadge>
      {item.disputed && <DisputedIndicator />}
      {identifiers.map(prop => (
        <PropertyDisplay label={prop.label} value={prop.value} />
      ))}
      <TimeStamp date={timestamp} />
    </Card>
  );
}
```

The example above are actual and the data structures should be adhered to strictly. 
Note: All currency values are in ETH since we're using Ethereum Mainnet (chainId=1).

# Prompt 2: Add Submission Flow to Light Curate Registry Frontend

Now that we have the basic display of registry items working, let's add the ability for users to submit new items.

## Setup
Use the same registry configuration from Prompt 1:
```typescript
import { LightCurateRegistry, SUPPORTED_CHAINS, uploadJSONToIPFS } from "light-curate-data-service";

const REGISTRY_ADDRESS = "0xda03509bb770061a61615ad8fc8e1858520ebd86";
const CHAIN_ID = SUPPORTED_CHAINS.ETHEREUM_MAINNET;

const registry = new LightCurateRegistry(REGISTRY_ADDRESS, CHAIN_ID);
```

## Requirements
1. Add a "Submit New Item" button to the registry view
2. Create a form modal that opens when the button is clicked
3. Dynamically generate form fields based on the registry's MetaEvidence
4. Handle submission to IPFS and the registry contract

## Implementation Steps

1. Fetch form structure from registry:
```typescript
const { registrationMetaEvidence } = await registry.getLatestMetaEvidence();
const metaData = await fetchFromIPFS(registrationMetaEvidence);
const formFields = metaData.metadata.columns;
```

2. Create submission form component:
```typescript
function SubmissionForm() {
  const [values, setValues] = useState({});
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Get deposit information
    const depositInfo = await registry.getSubmissionDepositAmount();
    // depositInfo returns:
    // {
    //   depositAmount: string;      // Total deposit in ETH
    //   depositInWei: string;       // Total deposit in Wei
    //   breakdown: {
    //     baseDeposit: string;      // Base deposit in ETH
    //     arbitrationCost: string;  // Arbitration cost in ETH
    //     total: string;            // Total deposit in ETH
    //   },
    //   challengePeriodDays: number // Challenge period duration in days
    // }

    const submission = {
      columns: formFields, // Include the original columns from MetaEvidence
      values: values      // Keys in values match the labels from formFields
    };

    // Upload to IPFS and submit to registry
    const ipfsPath = await uploadJSONToIPFS(submission);
    await registry.submitToRegistry(ipfsPath);
  };

  return (
    <form onSubmit={handleSubmit}>
      {formFields.map(field => (
        <FormField
          key={field.label}
          label={field.label}
          description={field.description}
          type={field.type}
          required={!field.label.includes("optional")}
          onChange={(value) => setValues({...values, [field.label]: value})}
        />
      ))}
      <button type="submit">Submit</button>
    </form>
  );
}
```

3. Add submission button and modal to the registry view from Prompt 1:
```typescript
function RegistryView() {
  // ... existing code from Prompt 1 ...

  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <button onClick={() => setShowForm(true)}>
        Submit New Item
      </button>
      
      {showForm && (
        <Modal onClose={() => setShowForm(false)}>
          <SubmissionForm />
        </Modal>
      )}

      {/* Existing item cards from Prompt 1 */}
      {items.map(item => (
        <ItemCard key={item.itemID} item={item} />
      ))}
    </div>
  );
}
```

## Data Format
The submission must follow this structure, where the keys in the `values` object exactly match the `label` fields from the MetaEvidence columns:
```typescript
{
  "columns": metaData.metadata.columns,  // Direct copy from MetaEvidence
  "values": {
    [field.label]: fieldValue, // For each field in columns array
  }
}
```

For example, if the MetaEvidence contains these columns:
```typescript
columns: [
  { label: "Project Title", type: "text", description: "..." },
  { label: "Repository", type: "link", description: "..." }
]
```

Your submission should look like:
```typescript
{
  columns: [/* same columns as above */],
  values: {
    "Project Title": "My Project",
    "Repository": "https://github.com/..."
  }
}
```

In the submission form, use the getSubmissionDepositAmount function in the registry object to display the breakdown of the deposit.

Note: This builds upon the item display functionality from Prompt 1, adding the submission flow while maintaining the same registry connection and configuration. The form fields and submission format are dynamically determined by the registry's MetaEvidence.


# Prompt 3: Item Detail Page

Create a detailed view for registry items that shows all item information and enables interaction with the item's lifecycle.

## Requirements

1. Display item details from the item data structure:
   - Status badge
   - All metadata properties (both identifier and non-identifier)
   - Submission timestamp
   - Disputed status
   - Evidence for each request
   - Appeal information if disputed

2. Add action buttons based on item state:
   - Remove button for registered items
   - Challenge button for items with pending requests
   - Appeal buttons for disputed items in appeal period

## Data Structures

### Item Details
Use `fetchItemsById` to get detailed item information ( or just pass the data from the initial fetchItems request):
```typescript
const { items } = await fetchItemsById(registryAddress, [itemID], chainId);
const item = items[0];

// Item structure returned:
// {
//   itemID: string;
//   status: "Absent" | "RegistrationRequested" | "Registered" | "ClearingRequested" | "Challenged";
//   disputed: boolean;
//   latestRequestSubmissionTime: string;  // Unix timestamp
//   metadata: {
//     props: {
//       description: string;    // Property description
//       isIdentifier: boolean;  // If property uniquely identifies item
//       label: string;         // Display label
//       type: string;          // Data type
//       value: string;         // Actual value
//     }[];
//   };
//   requests: {
//     evidenceGroup: {
//       evidences: {
//         party: string;     // Ethereum address of submitter
//         URI: string;       // IPFS path to evidence
//         timestamp: string; // Unix timestamp
//         id: string;       // Unique identifier
//       }[];
//     };
//     rounds: {
//       appealPeriodStart: string;  // Unix timestamp
//       appealPeriodEnd: string;    // Unix timestamp
//       appealed: boolean;
//       ruling: number;             // 0 = None, 1 = Accept, 2 = Reject
//     }[];
//   }[];
// }
```

### Evidence Content
When displaying evidence, fetch the each evidence's content from IPFS:
```typescript
const evidenceContent = await fetchFromIPFS(evidence.URI);
// Evidence content structure:
// {
//   title: string;
//   description: string;
// }
```

### Appeal Information
For disputed items, get appeal costs and funding status:

```typescript
// Get appeal costs
const appealCost = await registry.getAppealCost(itemID);
// Appeal cost structure:
// {
//   requesterAppealFee: string;      // Cost in ETH/xDAI
//   challengerAppealFee: string;     // Cost in ETH/xDAI
//   requesterAppealFeeWei: string;   // Cost in Wei
//   challengerAppealFeeWei: string;  // Cost in Wei
//   currentRuling: number;           // 0 = None, 1 = Accept, 2 = Reject
// }

// Get funding status
const fundingStatus = await registry.getAppealFundingStatus(itemID);
// Funding status structure:
// {
//   requesterFunded: boolean;
//   challengerFunded: boolean;
//   requesterAmountPaid: string;        // Amount in ETH/xDAI
//   challengerAmountPaid: string;       // Amount in ETH/xDAI
//   requesterAmountPaidWei: string;     // Amount in Wei
//   challengerAmountPaidWei: string;    // Amount in Wei
//   requesterRemainingToFund: string;   // Amount in ETH/xDAI
//   challengerRemainingToFund: string;  // Amount in ETH/xDAI
//   requesterRemainingToFundWei: string; // Amount in Wei
//   challengerRemainingToFundWei: string; // Amount in Wei
//   appealed: boolean;
//   currentRuling: number;              // 0 = None, 1 = Accept, 2 = Reject
//   roundIndex: number;                 // Current round (0-based)
// }
```

## Implementation Steps

1. Create item detail component:
```typescript
function ItemDetail({ itemID }) {
  const [item, setItem] = useState<Item | null>(null);
  const [appealCost, setAppealCost] = useState<AppealCost | null>(null);
  const [fundingStatus, setFundingStatus] = useState<AppealFundingStatus | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      const { items } = await fetchItemsById(registryAddress, [itemID], chainId);
      setItem(items[0]);

      if (items[0].disputed) {
        const cost = await registry.getAppealCost(itemID);
        const status = await registry.getAppealFundingStatus(itemID);
        setAppealCost(cost);
        setFundingStatus(status);
      }
    };
    loadItem();
  }, [itemID]);

  // ... render logic ...
}
```

2. Display item metadata and status:
```typescript
<StatusBadge status={item.status} disputed={item.disputed} />
{item.metadata.props.map(prop => (
  <PropertyDisplay
    key={prop.label}
    label={prop.label}
    value={prop.value}
    isIdentifier={prop.isIdentifier}
  />
))}
<TimeStamp date={new Date(parseInt(item.latestRequestSubmissionTime) * 1000)} />
```

3. Display evidence:
```typescript
{item.requests[0].evidenceGroup?.evidences.map(async (evidence) => {
  const content = await fetchFromIPFS(evidence.URI);
  return (
    <EvidenceCard
      key={evidence.id}
      title={content.title}
      description={content.description}
      submitter={evidence.party}
      timestamp={new Date(parseInt(evidence.timestamp) * 1000)}
    />
  );
})}
```

4. Add appeal interface for disputed items:
```typescript
{item.disputed && appealCost && fundingStatus && (
  <AppealSection
    appealCost={appealCost}
    fundingStatus={fundingStatus}
    onFundRequester={(amount) => registry.fundAppeal(itemID, 0, 1, amount)}
    onFundChallenger={(amount) => registry.fundAppeal(itemID, 0, 2, amount)}
  />
)}
```

5. Add action buttons based on item state:
```typescript
{item.status === "Registered" && (
  <Button onClick={() => registry.removeItem(itemID)}>
    Remove Item
  </Button>
)}

{(item.status === "RegistrationRequested" || 
  item.status === "ClearingRequested") && (
  <Button onClick={() => registry.challengeRequest(itemID)}>
    Challenge Request
  </Button>
)}
```

Note: All currency values (deposits, appeal costs, etc.) are in ETH when using Ethereum Mainnet (chainId=1) and in xDAI when using Gnosis Chain (chainId=100).
