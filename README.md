# AI NFT Studio - Gemini Generation + GenLayer Curation

AI NFT Studio turns a user's title and description into NFT artwork with **Gemini 3.1 Flash Image**, stores the generated image on **Vercel Blob**, and submits it automatically to a **GenLayer Intelligent Contract**. GenLayer's validator consensus-not the Gemini server-decides whether the artwork is approved and minted, returned for revision, or rejected.

## 1. Core Architecture: Why GenLayer?

In traditional blockchains, executing non-deterministic actions (like checking website status, rendering images, or querying LLMs) requires centralized or semi-decentralized oracles. 

Image generation and consensus have deliberately separate responsibilities:
1. **Gemini Image Generation**: A server-only Vercel Function creates a square image from the user's title and prompt. `GEMINI_API_KEY` never reaches the browser bundle.
2. **Public Evidence Storage**: The generated image is stored in a public Vercel Blob store. Its HTTPS URL is passed internally; the user never enters an image link.
3. **GenLayer Web Evidence Curation**: The leader node loads the generated artwork URL and captures screenshot bytes through `gl.nondet.web.render`.
4. **Consensus-Driven AI Jury**: The evidence is evaluated by three virtual personas (Curator, Skeptic, and Ethicist).
5. **Deterministic Verification**: Validator nodes run `validator_fn` to verify calculations and scoring consistency before committing state.

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
[User enters title + prompt]
       |
       v
[Vercel Function -> Gemini image generation]
       |
       v
[Public Blob URL returned internally]
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
```

---

## 7. GenLayer Studionet Network

- **RPC URL**: `https://studio.genlayer.com/api`
- **Chain ID**: `61999` (Hex: `0xf22f`)
- **Native Currency**: `GEN`
- **Block Explorer**: [explorer-studio.genlayer.com](https://explorer-studio.genlayer.com/)

---

## 8. Deployment and Configuration

### GenLayer Studio Deployment
1. Open [GenLayer Studio](https://studio.genlayer.com/).
2. Load the project workspace folder.
3. Select `studionet` in the top network bar.
4. Deploy the [contracts/registry.py](contracts/registry.py) contract.
5. Copy the deployed contract address.

> [!IMPORTANT]
> **Storage Reset**: If you redeploy or change the contract logic, perform a hard refresh (`Ctrl + Shift + R`) on the browser and reset the GenLayer browser extension storage to prevent cache sync mismatches.

### Frontend Environment Variables
Configure the `.env` file in the project root:
```env
# Deployed contract address on GenLayer Studionet
VITE_CONTRACT_ADDRESS=0x2676763dBD21891C5D4945d0e20D2108802C0997

# Target Project Repository GitHub URL
VITE_GITHUB_URL=https://github.com/ptc123456/ai-nft-studio-genlayer
```

Server-side secrets are configured in Vercel Project Settings, never in a `VITE_*` variable:

```env
GEMINI_API_KEY=<server-only-sensitive-secret>
BLOB_READ_WRITE_TOKEN=<injected-by-linked-vercel-blob-store>
```

Do not commit `.env`, `.env.local`, the Gemini key, or the Blob token. Variables prefixed with `VITE_` are public in the browser bundle and must never contain secrets.

### Vercel Deployment
To host the frontend and image API on Vercel:
1. Link the repository to a Vercel project.
2. Create a public Vercel Blob store and link it to the project.
3. Add `GEMINI_API_KEY` as a **Sensitive** Production/Preview variable.
4. Configure `VITE_CONTRACT_ADDRESS` and `VITE_GITHUB_URL`.
5. Deploy with `vercel deploy --prod`; `vercel.json` builds Vite to `dist` and allows the image function up to 60 seconds.

`POST /api/generate-image` accepts only a validated title and prompt, calls Gemini server-side, uploads the image, and returns a public URL. The browser passes that URL internally to the already-deployed `curate_and_mint` method.

Gemini image generation consumes the Google AI project quota. A `503` response saying the quota is exhausted means the Vercel integration is working but the configured Gemini project needs image quota/billing or a replacement key; no secret is exposed to the browser.

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

- **Network**: GenLayer Studionet
- **Deployed Contract Address**: `0x2676763dBD21891C5D4945d0e20D2108802C0997`
- **Deployment Transaction Hash**: `0x112db6b1595f3f876388f733b2273070a09e32738824205bc6a4c3d108f9e4e3`
- **Active Explorer**: [explorer-studio.genlayer.com/address/0x2676763dBD21891C5D4945d0e20D2108802C0997](https://explorer-studio.genlayer.com/address/0x2676763dBD21891C5D4945d0e20D2108802C0997)
- **Production Web App**: [ai-nft-studio-genlayer.vercel.app](https://ai-nft-studio-genlayer.vercel.app/)
