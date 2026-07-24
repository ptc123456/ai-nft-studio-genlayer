# Project Roadmap

This roadmap reflects the verified state of AI NFT Studio V1 as of July 2026. It separates delivered capabilities from proposed future milestones.

## V1 Delivered

### Product & Core Architecture
AI NFT Studio is a decentralized AI artwork generation and consensus-driven NFT curation dApp built on GenLayer. It solves the trust problem in generative AI NFTs by making visual evidence evaluation, prompt alignment, and content safety checks fully decentralized through GenLayer's multi-validator consensus.

The V1 pipeline:
1. **User Input:** A creator provides an artwork title and prompt.
2. **Server-Side Generation:** A Vercel Serverless Function generates a 1:1 square JPEG artwork via Gemini 3.1 Flash Image and uploads it to a public Vercel Blob store.
3. **GenLayer Submission:** The public Blob URL and prompt metadata are submitted to `curate_and_mint` on the `AINFTStudio` Intelligent Contract.
4. **On-Chain Evidence Fetch:** GenLayer validators fetch the rendered artwork directly via `gl.nondet.web.render()`.
5. **AI Jury Consensus:** GenLayer evaluates the artwork using three virtual personas (**Curator** 35%, **Skeptic** 25%, **Ethicist** 40%) through `gl.nondet.exec_prompt()`.
6. **Deterministic Verification:** The contract's `validator_fn` verifies score calculations and enforces strict verdict rules (approved if weighted score ≥ 70, safety ≥ 70, alignment ≥ 55).
7. **NFT Minting:** On an APPROVED verdict, the contract assigns a unique monotonic `token_id` and records the immutable review metadata on-chain.

### Intelligent Contract
Deployed `AINFTStudio.py` on GenLayer Studionet:
- **Contract Address:** `0x2676763dBD21891C5D4945d0e20D2108802C0997`
- **GenVM Version:** `v0.2.16`
- **Key Methods:** `curate_and_mint`, `transfer_artwork`, `get_artwork`, `get_review`, `get_latest_review`.

### Frontend & UI
- **Tech Stack:** React, Vite, Tailwind CSS, Dark Glassmorphism design system.
- **Features:** Prompt generator interface, real-time AI Jury consensus animation, NFT gallery, and detail viewer with full verification breakdown.

---

## V2 Future Roadmap

### Phase 1: Enhanced Curation & Dynamic Royalty Split
- [ ] Multi-image batch curation and candidate selection.
- [ ] Automated creator royalty distribution on secondary transfers.
- [ ] Community appeal mechanism for REVISE verdicts.

### Phase 2: Multi-Model & Cross-Chain Minting
- [ ] Multi-LLM validator diversity (combining Gemini, Claude, and Llama validators).
- [ ] Cross-chain NFT bridge to EVM chains (Ethereum / Polygon / Base) via LayerZero.
- [ ] Decentralized IPFS / Arweave permanent metadata mirroring.
