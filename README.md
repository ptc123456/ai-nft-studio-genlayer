# AI NFT Studio

AI NFT Studio is a GenLayer artwork-curation dApp. A creator enters a title and prompt, a server-side FLUX image service generates a square image, and the frontend submits the public image URL to a Python Intelligent Contract. The contract records an `APPROVED`, `REVISE`, or `REJECTED` review; approved submissions receive a registry token ID with transferable ownership.

## Verified links

- Live app: [ai-nft-studio-genlayer.vercel.app](https://ai-nft-studio-genlayer.vercel.app/)
- Studionet contract: [`0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F`](https://explorer-studio.genlayer.com/address/0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F)
- Deployment transaction: [`0x26f3040e...382c51`](https://explorer-studio.genlayer.com/tx/0x26f3040e201df07c36bbe68f026dc09663d5fd632036ebecd44c1aecde382c51)
- Detailed verification: [`DEPLOYMENT.md`](DEPLOYMENT.md)

The contract links and evidence are verified for this revision. The live-app URL is public; frontend parity with the final pushed revision is checked separately at the final release checkpoint.

## Trust problem

An artwork platform should not let its own server make the final, unverifiable decision about whether an image matches a prompt or satisfies the stated safety rules. A conventional smart contract cannot inspect a rendered image, while a centralized LLM API provides no shared validation or on-chain settlement. AI NFT Studio puts that consequential verdict inside GenLayer consensus: validators inspect the same public evidence and independently evaluate it before registry state can change.

The image generator and Vercel Blob host remain centralized services. They produce and expose the evidence; they do not decide the on-chain verdict.

## Why GenLayer is essential

The core operation is not image generation; it is reaching a shared verdict about exact visual evidence. GenLayer supplies raw web retrieval, LLM execution inside an Intelligent Contract, validator re-execution under the Equivalence Principle, and consensus-backed state. Traditional deterministic contracts cannot perform the visual judgment, and a single backend or LLM response cannot independently confirm its own result.

## How it works

1. The user enters a 2-80 character title and a 20-800 character visual prompt.
2. `api/generate-image.js` requests a FLUX image from Pollinations, normalizes it to PNG for Studionet vision-provider compatibility, and uploads it to a public Vercel Blob URL.
3. The browser calls `curate_and_mint(title, prompt, artwork_url)` with `genlayer-js`.
4. The consensus leader fetches the exact image bytes with `gl.nondet.web.get`, computes their Keccak-256 digest, and passes those same bytes to `gl.nondet.exec_prompt(..., images=[image_bytes])`.
5. One jury task produces three structured perspectives: Curator, Skeptic, and Ethicist. Their scores are aggregated into alignment, quality, originality, and safety.
6. Each validator independently fetches the URL, requires the exact same content digest, and reruns the jury task over its fetched bytes. It requires the same verdict and threshold conclusions, permits at most 20 points of variation per aggregate score, and also verifies schema, ranges, weighted-score arithmetic, and verdict logic. Free-form reasons are not compared byte for byte.
7. Safety below 70 produces `REJECTED`. Alignment below 55 or weighted score below 70 produces `REVISE`. Otherwise the result is `APPROVED`, a token ID is assigned, and registry ownership is stored.
8. A completed review stores `keccak256:<digest>` as the immutable artwork version. Reusing either the URL or the same bytes at another URL is rejected, including after `REVISE` or `REJECTED` outcomes.

Creator-controlled title and prompt values are encoded as canonical JSON before entering the jury instruction. The fixed evaluation policy and output schema remain outside and after that data block. This creates a deterministic data/instruction boundary; it does not make an LLM perfectly immune to adversarial language, so independent validator execution and deterministic verdict checks remain required.

## Architecture

| Layer | Implementation | Responsibility |
| --- | --- | --- |
| Web UI | Vanilla HTML, CSS, JavaScript, Vite | Wallet connection, prompt form, transaction state, review gallery, ownership transfer |
| Image endpoint | Vercel Function, Pollinations FLUX, Vercel Blob | Generate an image and return a public HTTPS evidence URL |
| Chain client | `genlayer-js` 1.1.8 | Studionet reads, writes, receipt polling, and execution verification |
| Intelligent Contract | `contracts/registry.py`, GenVM `v0.2.16` | Evidence evaluation, validator consensus, review storage, token registry, transfer rules |

The frontend and image endpoint prepare requests and evidence. The Studionet contract is the source of truth for accepted reviews, token IDs, and ownership.

## Intelligent Contract

The contract exposes two write methods and five view methods:

- Write: `curate_and_mint`, `transfer_artwork`
- View: `get_artwork`, `get_review`, `get_latest_review`, `get_total_minted`, `get_total_submissions`

Its validator independently refetches the image, checks the exact content digest, reruns the visual jury, and compares consequential verdict and threshold bands under the Equivalence Principle. Schema, range, arithmetic, duplicate-content, and ownership checks provide deterministic guards around that nondeterministic judgment. Registry tokens are native contract records rather than ERC-721 assets, and this deployed instance is intentionally frozen.

## Transaction lifecycle

The frontend submits a write, polls the transaction, waits for `FINALIZED`, and then checks the execution result. It displays success only when finalization and successful execution are both confirmed. A failed or unverified execution is shown as failure or undetermined and does not update the gallery as a successful mint. Transfers use the same finalization, execution, and state-readback checks.

## Run locally

Requirements: Node.js 20.19+, Python virtual environment, current GenLayer development tools, and a linked Vercel Blob store.

```powershell
npm ci
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
npm run dev
```

`BLOB_READ_WRITE_TOKEN` is server-side only and must be supplied by Vercel Blob. `VITE_CONTRACT_ADDRESS` is public configuration and must contain a verified deployment address.

## Tests and verification

```powershell
.venv\Scripts\python.exe -m pytest -q
npm run test:frontend
.venv\Scripts\genvm-lint.exe check contracts\registry.py
npm run build
```

The Python suite covers approval, revision, rejection, malformed evidence and results, URL and content replay, immutable hash binding, hostile creator input, ownership transfer, validator disagreement, all `54/55/56`, `69/70/71`, and tolerance `19/20/21` boundaries. It proves that schema-valid leader output is rejected when the independently fetched bytes, verdict, or consequential threshold band differs. Frontend tests cover generated-image PNG normalization, status normalization, `FINALIZED` detection, and execution-result verification. Exact test counts are recorded in the release verification evidence rather than hard-coded here.

## Deployment

The reviewed contract revision is deployed on GenLayer Studionet. Its deployed source is byte-identical to `contracts/registry.py` at commit `90ceadbc64f8e844b6956b9e131fd07bb9ae54da`.

| Evidence | Verified result |
| --- | --- |
| Contract deployment | `FINALIZED`, execution `SUCCESS`, source SHA-256 parity confirmed |
| [`APPROVED` mint](https://explorer-studio.genlayer.com/tx/0xb5d7be409d20c4bc37bca201270f2b8a7b0c039870b299c6890677be45a929c9) | Image-grounded verdict; token `1` minted and read back |
| [`REVISE` review](https://explorer-studio.genlayer.com/tx/0xcc9abd4ec832f1b54f10be40d66719b8e67de539c288f64055f3a85eeff9a165) | Image-grounded prompt mismatch; no mint |
| [`REJECTED` review](https://explorer-studio.genlayer.com/tx/0xc1cec9a74977cdc045f35e42073ebb247fb7ae3dd01033da599ac35ec83ac3c2) | Image-grounded safety failure; no mint |
| [`transfer_artwork`](https://explorer-studio.genlayer.com/tx/0x75b2f5444afc2cacb98ad69c8e8bfbf28d8ea8608c488873e1bfcba406c0361b) | `FINALIZED`, execution `SUCCESS`; owner updated and read back |

[`DEPLOYMENT.md`](DEPLOYMENT.md) records the exact source hash, deployment receipt, complete live proof matrix, diagnostic failures, accepted-state readbacks, and recovery boundary.

## Security and trust boundaries

- Pollinations and Vercel Blob are centralized dependencies; generation or hosting failure prevents submission, but neither service determines the contract verdict.
- Evidence provenance is the public HTTPS source fetched independently by GenLayer validators. The stored Keccak-256 digest identifies the exact adjudicated byte version; the finalized transaction and `submission_id` establish its on-chain acceptance and sequence.
- Creator-controlled values are canonical-JSON encoded and kept separate from the fixed jury policy and schema.
- Success requires a finalized transaction, successful execution, validator consensus, and contract-state readback. Finalization alone is not treated as success.

## Known limitations

- A later URL mutation or outage cannot alter the stored digest, but it can make the external image unavailable. The registry does not archive image bytes on-chain.
- Duplicate protection covers exact URLs and exact content bytes. It is not perceptual image matching, so visually similar re-encodings can have different hashes.
- Curator, Skeptic, and Ethicist are structured perspectives in one jury prompt, not separate providers or separate validators.
- Validator results can vary. Consensus compares verdicts and threshold conclusions exactly and aggregate scores within a bounded tolerance.
- Registry tokens are native records in this contract, not ERC-721 tokens and not bridged assets.
- Studionet model routing can produce conservative or divergent visual assessments. One documented rejection attempt reached transaction status `FINALIZED` with result `MAJORITY_DISAGREE` and did not change state. The accepted retry used simpler visual evidence and reached consensus.
