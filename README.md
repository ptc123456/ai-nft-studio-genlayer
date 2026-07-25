# AI NFT Studio

AI NFT Studio is a GenLayer artwork-curation dApp. A creator enters a title and prompt, a server-side FLUX image service generates a square image, and the frontend submits the public image URL to a Python Intelligent Contract. The contract records an `APPROVED`, `REVISE`, or `REJECTED` review; approved submissions receive a registry token ID with transferable ownership.

## Trust problem

An artwork platform should not let its own server make the final, unverifiable decision about whether an image matches a prompt or satisfies the stated safety rules. A conventional smart contract cannot inspect a rendered image, while a centralized LLM API provides no shared validation or on-chain settlement. AI NFT Studio puts that consequential verdict inside GenLayer consensus: validators inspect the same public evidence and independently evaluate it before registry state can change.

The image generator and Vercel Blob host remain centralized services. They produce and expose the evidence; they do not decide the on-chain verdict.

## How it works

1. The user enters a 2–80 character title and a 20–800 character visual prompt.
2. `api/generate-image.js` requests a FLUX image from Pollinations and uploads the returned image to a public Vercel Blob URL.
3. The browser calls `curate_and_mint(title, prompt, artwork_url)` with `genlayer-js`.
4. The consensus leader renders the image with `gl.nondet.web.render(..., mode="screenshot")` and passes it to `gl.nondet.exec_prompt(..., images=[rendered])`.
5. One jury task produces three structured perspectives: Curator, Skeptic, and Ethicist. Their scores are aggregated into alignment, quality, originality, and safety.
6. Each validator independently renders the same URL and reruns the jury task. It requires the same verdict and threshold conclusions, permits at most 20 points of variation per aggregate score, and also verifies schema, ranges, weighted-score arithmetic, and verdict logic. Free-form reasons are not compared byte for byte.
7. Safety below 70 produces `REJECTED`. Alignment below 55 or weighted score below 70 produces `REVISE`. Otherwise the result is `APPROVED`, a token ID is assigned, and registry ownership is stored.
8. An exact artwork URL can be submitted only once after a completed review, including `REVISE` or `REJECTED` outcomes.

## Why GenLayer

The core operation is not image generation; it is reaching a shared verdict about visual evidence. GenLayer supplies web rendering, LLM execution inside an Intelligent Contract, validator re-execution under the Equivalence Principle, and consensus-backed state. Traditional deterministic contracts cannot perform the visual judgment, and a single backend or LLM response cannot independently confirm its own result.

## Architecture

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Web UI | Vanilla HTML, CSS, JavaScript, Vite | Wallet connection, prompt form, transaction state, review gallery, ownership transfer |
| Image endpoint | Vercel Function, Pollinations FLUX, Vercel Blob | Generate an image and return a public HTTPS evidence URL |
| Chain client | `genlayer-js` 1.1.8 | Studionet reads, writes, receipt polling, and execution verification |
| Intelligent Contract | `contracts/registry.py`, GenVM `v0.2.16` | Evidence evaluation, validator consensus, review storage, token registry, transfer rules |

Contract methods:

- Write: `curate_and_mint`, `transfer_artwork`
- View: `get_artwork`, `get_review`, `get_latest_review`, `get_total_minted`, `get_total_submissions`

## Deployment status

The repository now contains a release-candidate contract with independent validator re-evaluation. That contract revision is **not deployed yet**. The existing public deployment and live app predate this correction and must not be presented as evidence for the revised consensus behavior.

| Existing public component | Location | Status |
| --- | --- | --- |
| Legacy Studionet contract | [`0x2676763dBD21891C5D4945d0e20D2108802C0997`](https://explorer-studio.genlayer.com/address/0x2676763dBD21891C5D4945d0e20D2108802C0997) | Deployed before independent validator re-evaluation was added |
| Existing Vercel app | [ai-nft-studio-genlayer.vercel.app](https://ai-nft-studio-genlayer.vercel.app/) | Currently configured for the legacy contract |

Before submission, deploy `contracts/registry.py` as a new Studionet instance, verify the deployment transaction is `FINALIZED` with `SUCCESS`, replace `VITE_CONTRACT_ADDRESS` with that real address, deploy the frontend, and update this table. Do not use a placeholder contract address.

## Setup

Requirements: Node.js 20.19+, Python virtual environment, current GenLayer development tools, and a linked Vercel Blob store.

```powershell
npm ci
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
npm run dev
```

`BLOB_READ_WRITE_TOKEN` is server-side only and must be supplied by Vercel Blob. `VITE_CONTRACT_ADDRESS` is public configuration and must contain a verified deployment address.

## Tests and validation

```powershell
.venv\Scripts\python.exe -m pytest -q
npm run test:frontend
.venv\Scripts\genvm-lint.exe check contracts\registry.py
npm run build
```

The Python suite covers approval, revision, rejection, malformed evidence/results, duplicate URLs, ownership transfer, and validator disagreement. In particular, it proves that a schema-valid leader `APPROVED` result is rejected when independent validator evaluation reaches `REVISE`. Frontend tests cover status normalization, `FINALIZED` detection, and execution-result verification.

## Transaction lifecycle

The frontend submits the write, polls the transaction, waits for `FINALIZED`, and then checks the execution result. It displays success only when finalization and successful execution are both confirmed. A failed or unverified execution is shown as failure/undetermined and does not update the gallery as a successful mint. Transfers use the same finalization and execution checks.

## Trust boundaries and limitations

- Pollinations and Vercel Blob are centralized dependencies; generation or hosting failure prevents submission.
- The contract verifies the rendered content available at the submitted URL during consensus. It does not content-hash the image or guarantee that the URL will remain available forever.
- Duplicate protection is exact-URL based, not perceptual image matching.
- Curator, Skeptic, and Ethicist are structured perspectives in one jury prompt, not separate providers or separate validators.
- Validator results can vary. Consensus compares verdicts and threshold conclusions exactly and aggregate scores within a bounded tolerance.
- Registry tokens are native records in this contract, not ERC-721 tokens and not bridged assets.
- The release-candidate contract requires a new deployment; the existing Explorer address does not prove the corrected validator behavior.
