# AI NFT Studio — GenLayer Curation & Registry

AI NFT Studio is a decentralized application built on **GenLayer**, demonstrating the power of Intelligent Contracts. It uses consensus-driven AI agents (virtual personas) to curate and register digital art directly on-chain.

## 1. Core Architecture: Why GenLayer?

In traditional blockchains, executing non-deterministic actions (like checking website status, rendering images, or querying LLMs) requires centralized or semi-decentralized oracles. 

With **GenLayer**, these non-deterministic operations are executed natively within the contract consensus:
1. **Web Evidence Curation**: The leader node loads the submitted artwork URL and captures the screenshot bytes on-chain via `gl.nondet.web.render`.
2. **Consensus-Driven AI Jury**: The visual evidence is passed to an AI Jury consisting of three distinct virtual personas (Curator, Skeptic, and Ethicist).
3. **Deterministic Verification**: Validator nodes run a strict, deterministic validation function (`validator_fn`) checking the leader's calculations and scoring consistency before committing the state write.

This guarantees that the artwork's visual quality, prompt alignment, safety, and metadata are verified by multiple nodes before it can be minted.

---

## 2. Platform Design & Interface

The application features a premium, responsive **dark glassmorphic design**:
- Glassmorphic panels built using backdrop filters and border gradients to create depth.
- HSL-driven accent colors (vibrant cyber blue and neon hints) to avoid default browser styling.
- Responsive grids shifting from side-by-side split panels on desktop (1440px) to single-column stacking on mobile (390px).

---

## 3. Storage Layout & Model

The Intelligent Contract uses native GenLayer `TreeMap` structures to index reviews and owners:
```python
next_submission_id: u256       # Counter for all curation requests
next_token_id: u256            # Counter for approved tokens (starts at 1)
total_minted: u256             # Total count of approved mints
reviews: TreeMap[u256, str]    # Maps submission ID to serialized JSON review data
latest_submission: TreeMap[Address, str] # Maps user address to their latest review JSON
token_to_submission: TreeMap[u256, u256] # Maps token ID to submission ID
minted_urls: TreeMap[str, u256]          # Prevents duplicate URL mints
token_owners: TreeMap[u256, Address]     # Maps token ID to current owner address
```

---

## 4. Curation Pipeline Flow

```
[User Form Submit]
       │
       ▼
[Deterministic Input Guards]
       │
       ▼ (if valid inputs)
[gl.vm.run_nondet_unsafe]
       ├──► 1. Web screenshot rendering: gl.nondet.web.render()
       ├──► 2. Render checks (detect render fail / empty body / size > 10MB)
       ├──► 3. Call AI Jury LLM: gl.nondet.exec_prompt()
       ├──► 4. Aggregate scores from Curator, Skeptic, and Ethicist
       │
       ▼
[validator_fn (Deterministic Verification)]
       ├──► Verify mathematical weighting calculation
       ├──► Enforce verdict rules & score ranges (0 - 100)
       ├──► Confirm consistency between scores and final verdict
       │
       ▼ (if validator_fn returns True)
[Post-Consensus Storage Writes]
       └──► Store review metadata & mint token (if APPROVED)
```

### AI Persona Weighting
- **Curator Score**: 35% (focuses on prompt alignment and visual quality)
- **Skeptic Score**: 25% (focuses on originality and generic patterns)
- **Ethicist Score**: 20% (focuses on content safety and violation risks)
- **Ethicist Safety**: 20%

### Verdict Criteria
- **REJECTED**: If `safety` < 70 (content policy or safety violation)
- **REVISE**: If `alignment` < 55 or `weighted_score` < 70 (revision feedback provided)
- **APPROVED**: If safety >= 70, alignment >= 55, and weighted score >= 70 (assigned native token ID)

---

## 5. Intelligent Contract Methods

- **`curate_and_mint(title: str, prompt: str, artwork_url: str) -> u256`**:
  Validates inputs, requests visual consensus curation, and mints a token if approved. Returns the token ID (or 0 if revised/rejected).
- **`transfer_artwork(token_id: u256, new_owner: Address) -> bool`**:
  Transfers token ownership to `new_owner`. Only callable by the current owner.
- **`get_review(submission_id: u256) -> str`**:
  Returns the serialized JSON review metadata for a given submission.
- **`get_latest_review(owner: Address) -> str`**:
  Returns the serialized JSON review metadata for the latest submission of a given address.
- **`get_artwork(token_id: u256) -> str`**:
  Returns metadata representing the artwork (title, prompt, url, owner).
- **`get_total_minted() -> u256`**:
  Returns the total count of minted artworks.
- **`get_total_submissions() -> u256`**:
  Returns the total number of curation submissions.

---

## 6. Local Setup & Verification

### Prerequisites
- Python 3.10+
- Node.js 18+

### Setup Commands
```bash
# Install frontend package dependencies
npm install

# Build frontend production assets
npm run build

# Run smart contract verification tests
$env:PYTHONIOENCODING="utf-8"
.venv\Scripts\python.exe -m pytest -v

# Run smart contract linter check
$env:PYTHONIOENCODING="utf-8"
.venv\Scripts\genvm-lint.exe check contracts\registry.py
```

### Test Network Configuration (`gltest.config.yaml`)
Create `gltest.config.yaml` in the project root:
```yaml
networks:
  default: "localnet"
  localnet:
    url: "http://localhost:4000/api"
  studionet:
    url: "https://studio.genlayer.com/api"
  testnet_bradbury:
    url: "https://rpc-bradbury.genlayer.com"
```

---

## 7. GenLayer Bradbury Testnet

- **RPC URL**: `https://rpc-bradbury.genlayer.com`
- **Chain ID**: `4221` (Hex: `0x107d`)
- **Native Currency**: `GEN`
- **Block Explorer**: [explorer-bradbury.genlayer.com](https://explorer-bradbury.genlayer.com/)

---

## 8. Deployment Steps

### GenLayer Studio Deployment
1. Open [GenLayer Studio](https://studio.genlayer.com/).
2. Load the project workspace folder.
3. Select `testnet_bradbury` or `studionet` in the top network bar.
4. Deploy the [contracts/registry.py](contracts/registry.py) contract.
5. Copy the deployed contract address.

> [!IMPORTANT]
> **Storage Reset**: If you redeploy or change the contract logic, perform a hard refresh (`Ctrl + Shift + R`) on the browser and reset the GenLayer browser extension storage to prevent cache sync mismatches.

### Frontend Environment Variables
Configure the `.env` file in the project root:
```env
# Populate with the deployed address from GenLayer Studio
VITE_CONTRACT_ADDRESS=

# Overrides default github link
VITE_GITHUB_URL=https://github.com/ptc123456/ai-nft-studio-genlayer
```
*Note: Keep `VITE_CONTRACT_ADDRESS` empty until you complete a live deployment.*

### Vercel Deployment
To host the frontend on Vercel:
1. Link your repository on Vercel.
2. In Project Settings, configure the Environment Variables (`VITE_CONTRACT_ADDRESS` and `VITE_GITHUB_URL`).
3. Deploy the build configuration using `dist` as the output directory.

---

## 9. Frontend Integration & Transaction Lifecycle

The frontend client in `app.js` is split into:
- **`readClient`**: Used for lightweight querying (stats, balances, gallery listings).
- **`writeClient`**: Uses the provider injected by the active wallet extension (`window.ethereum`) to sign write transactions.

### Lifecycle Validation Rules
1. The transaction is broadcasted (`writeContract` -> hash generated).
2. The dApp polls for finalization (`waitForTransactionReceipt` -> status reaches `FINALIZED`).
3. The execution outcome is checked against `txExecutionResultName` (demanding `FINISHED_WITH_RETURN` for success). If it evaluates to `FINISHED_WITH_ERROR`, the UI rejects rendering the cards.

---

## 10. Release Status
- **Contract Address Deployed**: None (Leave empty for configuration).
- **Live URL**: None (Local development mode).
