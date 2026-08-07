# AI NFT Studio

AI NFT Studio is a GenLayer artwork-curation dApp. A creator enters a title and prompt, a server-side FLUX image service generates a square image, and the frontend submits the public image URL to a Python Intelligent Contract. The contract records an `APPROVED`, `REVISE`, or `REJECTED` review; approved submissions receive a registry token ID with transferable ownership.

## Trust problem

An artwork platform should not let its own server make the final, unverifiable decision about whether an image matches a prompt or satisfies the stated safety rules. A conventional smart contract cannot inspect a rendered image, while a centralized LLM API provides no shared validation or on-chain settlement. AI NFT Studio puts that consequential verdict inside GenLayer consensus: validators inspect the same public evidence and independently evaluate it before registry state can change.

The image generator and Vercel Blob host remain centralized services. They produce and expose the evidence; they do not decide the on-chain verdict.

## How it works

1. The user enters a 2–80 character title and a 20–800 character visual prompt.
2. `api/generate-image.js` requests a FLUX image from Pollinations, normalizes it to PNG for Studionet vision-provider compatibility, and uploads it to a public Vercel Blob URL.
3. The browser calls `curate_and_mint(title, prompt, artwork_url)` with `genlayer-js`.
4. The consensus leader fetches the exact image bytes with `gl.nondet.web.get`, computes their Keccak-256 digest, and passes those same bytes to `gl.nondet.exec_prompt(..., images=[image_bytes])`.
5. One jury task produces three structured perspectives: Curator, Skeptic, and Ethicist. Their scores are aggregated into alignment, quality, originality, and safety.
6. Each validator independently fetches the URL, requires the exact same content digest, and reruns the jury task over its fetched bytes. It requires the same verdict and threshold conclusions, permits at most 20 points of variation per aggregate score, and also verifies schema, ranges, weighted-score arithmetic, and verdict logic. Free-form reasons are not compared byte for byte.
7. Safety below 70 produces `REJECTED`. Alignment below 55 or weighted score below 70 produces `REVISE`. Otherwise the result is `APPROVED`, a token ID is assigned, and registry ownership is stored.
8. A completed review stores `keccak256:<digest>` as the immutable artwork version. Reusing either the URL or the same bytes at another URL is rejected, including after `REVISE` or `REJECTED` outcomes.

Creator-controlled title and prompt values are encoded as canonical JSON before entering the jury instruction. The fixed evaluation policy and output schema remain outside and after that data block. This creates a deterministic data/instruction boundary; it does not make an LLM perfectly immune to adversarial language, so independent validator execution and deterministic verdict checks remain required.

## Why GenLayer

The core operation is not image generation; it is reaching a shared verdict about exact visual evidence. GenLayer supplies raw web retrieval, LLM execution inside an Intelligent Contract, validator re-execution under the Equivalence Principle, and consensus-backed state. Traditional deterministic contracts cannot perform the visual judgment, and a single backend or LLM response cannot independently confirm its own result.

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

The reviewed contract revision is deployed on Studionet. Its deployed source is byte-identical to `contracts/registry.py` at commit `90ceadbc64f8e844b6956b9e131fd07bb9ae54da`.

| Component | Location | Verified status |
| --- | --- | --- |
| Studionet contract | [`0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F`](https://explorer-studio.genlayer.com/address/0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F) | Deployment `FINALIZED`, execution `SUCCESS`, source SHA-256 parity confirmed |
| Deployment transaction | [`0x26f3040e...382c51`](https://explorer-studio.genlayer.com/tx/0x26f3040e201df07c36bbe68f026dc09663d5fd632036ebecd44c1aecde382c51) | Five validator votes agreed |
| Approved mint | [`0xb5d7be40...a929c9`](https://explorer-studio.genlayer.com/tx/0xb5d7be409d20c4bc37bca201270f2b8a7b0c039870b299c6890677be45a929c9) | `FINALIZED`, `SUCCESS`, image-grounded `APPROVED`; token `1` minted and read back |
| Semantic revision | [`0xcc9abd4e...f9a165`](https://explorer-studio.genlayer.com/tx/0xcc9abd4ec832f1b54f10be40d66719b8e67de539c288f64055f3a85eeff9a165) | `FINALIZED`, `SUCCESS`, image-grounded `REVISE`; alignment `2`, no mint |
| Semantic rejection | [`0xc1cec9a7...3ac3c2`](https://explorer-studio.genlayer.com/tx/0xc1cec9a74977cdc045f35e42073ebb247fb7ae3dd01033da599ac35ec83ac3c2) | `FINALIZED`, `SUCCESS`, image-grounded `REJECTED`; safety `9`, no mint |
| Ownership transfer | [`0x75b2f544...c0361b`](https://explorer-studio.genlayer.com/tx/0x75b2f5444afc2cacb98ad69c8e8bfbf28d8ea8608c488873e1bfcba406c0361b) | `FINALIZED`, `SUCCESS`, five `AGREE` entries in the round vote array; token `1` owner updated |
| Vercel app | [ai-nft-studio-genlayer.vercel.app](https://ai-nft-studio-genlayer.vercel.app/) | Public redeployment of this revision is still pending |

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for source parity, the complete live proof matrix, diagnostic failures, accepted-state readbacks, and reviewer-feedback closure.

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

The Python suite covers approval, revision, rejection, malformed evidence/results, URL and content replay, immutable hash binding, hostile creator input, ownership transfer, validator disagreement, all `54/55/56`, `69/70/71`, and tolerance `19/20/21` boundaries. It proves that schema-valid leader output is rejected when the independently fetched bytes, verdict, or consequential threshold band differs. Frontend tests cover generated-image PNG normalization, status normalization, `FINALIZED` detection, and execution-result verification. Exact test counts are recorded from the release verification run rather than hard-coded here.

## Transaction lifecycle

The frontend submits the write, polls the transaction, waits for `FINALIZED`, and then checks the execution result. It displays success only when finalization and successful execution are both confirmed. A failed or unverified execution is shown as failure/undetermined and does not update the gallery as a successful mint. Transfers use the same finalization and execution checks.

## Trust boundaries and limitations

- Pollinations and Vercel Blob are centralized dependencies; generation or hosting failure prevents submission.
- Evidence provenance is the public HTTPS source fetched independently by GenLayer validators. The stored Keccak-256 digest identifies the exact adjudicated byte version; the finalized transaction and `submission_id` establish its on-chain acceptance and sequence. No unverified wall-clock timestamp is claimed inside the review record.
- A later URL mutation or outage cannot alter the stored digest, but it can make the external image unavailable. The registry does not archive image bytes on-chain.
- Duplicate protection covers exact URLs and exact content bytes. It is not perceptual image matching, so visually similar re-encodings can have different hashes.
- Curator, Skeptic, and Ethicist are structured perspectives in one jury prompt, not separate providers or separate validators.
- Validator results can vary. Consensus compares verdicts and threshold conclusions exactly and aggregate scores within a bounded tolerance.
- Registry tokens are native records in this contract, not ERC-721 tokens and not bridged assets.
- Studionet model routing can still produce conservative or divergent visual assessments. One documented rejection attempt became `UNDETERMINED` after validator score disagreement and did not change state; the accepted retry used simpler visual evidence and reached consensus. The live proof demonstrates all three verdict branches, not identical intermediate scores across validators.
