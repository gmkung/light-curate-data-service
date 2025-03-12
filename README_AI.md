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
- `status`: Current status of the item
- `disputed`: Boolean flag if item is disputed
- `latestRequestSubmissionTime`: Timestamp of latest activity
- `metadata.props`: Array of structured properties:
  ```typescript
  {
    description: string; // Property description
    isIdentifier: boolean; // If property uniquely identifies item
    label: string; // Display label
    type: string; // Data type
    value: string; // Actual value
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


# Prompt 2 : Display Items from Light Curate Registry

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

Note: This builds upon the item display functionality from Prompt 1, adding the submission flow while maintaining the same registry connection and configuration. The form fields and submission format are dynamically determined by the registry's MetaEvidence.
