Constants:

- IPFS host: https://cdn.kleros.link/
- RPC URLs:
  - Ethereum:
  - Gnosis:
- subgraph URL:
  - Ethereum:
  - Gnosis:
- To provide:
  - Registry address：[TO PROVIDE]

#Instructions

#1 Do research:

List out all the view functions in the ABI and then use that to map out how to use the data from the view functions to call the various write functions.

#2 See which of these are actually relevant for users (e.g. not related to the setup/admin of the registry) and illustrate concisely but in great functional detail how each of these read and write functions are going to be used in the different user stories surrounding the registry.

#3 Now, create a set of utilities in an NPM package that maps to every single one of the view functions, storing and using reusable constants and variables globally when applicable.

- arbitrator()
- metaevidence (read from MetaEvidence event()) \* appeal times

Deposit information functions: (use arbitrationCost function from KlerosLiquid using arbitratioExtraData):

- submissionBaseDeposit
- submissionChallengeBaseDeposit
- removalBaseDeposit
- removalChallengeBaseDeposit

! Also create a function too show appealCost per dispute/dispute.

#4 Create @ipfs.ts
A function to safely upload files to IPFS.

#4 Create, the write functions, building on the view functions above.

Actions (assume URIs are IPFS CIDs in the format of '/ipfs/[cid]' and use the uploadToIPFS function where relevant to create this package):

- item actions:
  - addItem
  - removeItem
  - challengeRequest (when an item is in RegistrationRequested or clearingRequested)
- appeal actions:
  - contribute
  - fundAppeal

#5 Describe in a final README file, how all these different functions are used, in short user stories, referencing the ABIs when doing so.
