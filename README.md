# AI NFT Studio

> **Decentralized AI artwork generation and consensus-based NFT curation on GenLayer.**

AI NFT Studio generates custom artwork using a **FLUX image service**, stores the generated media on **Vercel Blob**, and submits the public evidence to a **GenLayer Intelligent Contract**. The contract evaluates prompt alignment, visual quality, originality, and safety before recording an approval, revision request, or rejection on-chain.

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────────────┐     ┌─────────────────┐
│  User Input     │     │ FLUX Engine & Vercel │     │      GenLayer Jury          │     │  On-Chain Mint  │
│                 │     │                      │     │                             │     │                 │
│ Title + Prompt  │────>│ Generate 1:1 Artwork │────>│ 3 AI Personas (Curator,     │────>│ Assign Token ID │
│                 │     │ & Host Public Blob   │     │ Skeptic, Ethicist) Consensus│     │ & Store Review  │
└─────────────────┘     └──────────────────────┘     └─────────────────────────────┘     └─────────────────┘
```

---

## 1. The Problem

Generative AI NFTs currently suffer from severe trust friction:

1. **Centralized Mints:** Most AI NFT platforms mint tokens off-chain or rely on a single centralized server to generate and approve images. The creator or server admin can swap images or fake approvals.
2. **No Visual Verification On-Chain:** Traditional blockchains (Ethereum, Solana) cannot inspect image content, evaluate prompt adherence, or enforce content safety rules inside a smart contract.
3. **Unverifiable Decisions:** A centralized image or LLM API cannot provide shared finality, an auditable review record, or enforceable token ownership.

---

## 2. How It Works

1. **Generate Artwork:** The user provides a title and prompt. A serverless Vercel Function generates a 1:1 square image using the FLUX AI Image Engine and stores it on Vercel Blob.
2. **Submit to GenLayer:** The public image URL and metadata are sent to `curate_and_mint` on the GenLayer Intelligent Contract.
3. **Consensus Curation:** The leader node fetches the image via `gl.nondet.web.render` and evaluates it using one AI Jury prompt (`gl.nondet.exec_prompt`) containing Curator, Skeptic, and Ethicist roles. The current validator deterministically verifies the returned schema, score ranges, weighting, and verdict consistency.
4. **On-Chain Settlement:** If approved (weighted score ≥ 70, safety ≥ 70, alignment ≥ 55), the contract assigns a unique `token_id` and records the immutable review metadata on-chain.

---

## 3. Why GenLayer Is Essential

- **On-Chain Web Access:** GenLayer validators capture the rendered artwork directly from HTTPS URLs via `gl.nondet.web.render()`.
- **Multi-Persona Evaluation:** Curator, Skeptic, and Ethicist roles are evaluated within the contract's jury prompt. They are structured perspectives in one nondeterministic evaluation, not three independent external services.
- **Deterministic Verification:** The contract's `validator_fn` mathematically checks score weighting and verdict logic before committing state to the ledger.
- **Trust Boundary:** The deployed V1 validator does not independently rerun the visual judgment. Independent evidence re-evaluation is planned as a future contract upgrade and will require redeployment.

---

## 4. Live Deployment

| Component | Network | Address / Location | Description |
|-----------|---------|--------------------|-------------|
| `AINFTStudio.py` | GenLayer Studionet | [`0x2676763dBD21891C5D4945d0e20D2108802C0997`](https://explorer-studio.genlayer.com/address/0x2676763dBD21891C5D4945d0e20D2108802C0997) | Intelligent Contract for AI Jury curation & NFT minting |
| Frontend | Vercel | [ai-nft-studio-genlayer.vercel.app](https://ai-nft-studio-genlayer.vercel.app/) | Interactive UI for prompt entry, live consensus tracking & NFT gallery |

---

## 5. Architecture & Contract Methods

### Storage Layout
- `next_submission_id: u256` — Counter for curation requests
- `next_token_id: u256` — Monotonic counter for minted NFTs
- `reviews: TreeMap[u256, str]` — Serialized JSON review metadata per submission
- `token_owners: TreeMap[u256, Address]` — Token ownership registry
- `minted_urls: TreeMap[str, u256]` — Deduplication mapping for image URLs

### Key Methods
- `curate_and_mint(title: str, prompt: str, artwork_url: str) -> u256`: Submits artwork for AI Jury evaluation and mints an NFT if approved.
- `transfer_artwork(token_id: u256, new_owner: Address) -> bool`: Transfers NFT ownership to a new address.
- `get_artwork(token_id: u256) -> str`: Returns token metadata, owner, and review report.
- `get_review(submission_id: u256) -> str`: Fetches detailed JSON curation report.

---

## 6. Quick Start

### 1. Install Dependencies
```bash
npm ci
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
```

### 2. Configure Environment
Create `.env` with contract address:
```env
VITE_CONTRACT_ADDRESS=0x2676763dBD21891C5D4945d0e20D2108802C0997
BLOB_READ_WRITE_TOKEN=<injected after linking a Vercel Blob store>
```

`BLOB_READ_WRITE_TOKEN` is required because the Intelligent Contract accepts only a public HTTPS artwork URL. The API returns an error instead of an unusable data URL when Blob storage is unavailable.

### 3. Run Development Server
```bash
npm run dev
```

### 4. Run Contract Tests
```bash
.venv\Scripts\python.exe -m pytest -q
npm run test:frontend
```

### 5. Transaction Lifecycle

The frontend normalizes numeric and named GenLayer transaction statuses, waits for `FINALIZED`, and verifies execution through the SDK result or the Studionet leader receipt. Missing execution evidence is shown as unverified instead of being treated as success.
