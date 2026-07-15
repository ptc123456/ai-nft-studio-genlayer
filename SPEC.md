# AI NFT Studio — GenLayer Port Specification

## Project Identity

- Project: AI NFT Studio for GenLayer
- Working folder: `D:\Projects\Genlayer\ai-nft-studio-genlayer`
- Source design: `https://ai-nft-studio-ritual.vercel.app/app`
- GitHub release owner: `ptc123456`
- Target repository: `ptc123456/ai-nft-studio-genlayer`
- Current stage: implementation handoff to Antigravity

## Product Goal

Preserve the existing AI NFT Studio dashboard design while replacing every Ritual-specific contract, network, precompile, scheduler, credit, mock-success, and wallet integration with a real GenLayer workflow.

# Migration Target: GenLayer Studionet

Port to GenLayer Studionet. Maintain dark theme style.

The product is a consensus-curated AI artwork registry. A creator submits a title, an art prompt, and a public HTTPS image URL. A GenLayer Intelligent Contract fetches the image and asks independent AI validators to judge prompt alignment, visual quality, originality, and safety. The contract reaches semantic consensus on the decision. Approved work is assigned a GenLayer-native artwork token ID and stored in the on-chain registry; other work receives a `REVISE` or `REJECTED` verdict with actionable feedback.

One-line GenLayer fit:

> The product cannot exist without GenLayer because the mint/no-mint decision depends on independent validators reading visual web evidence and reaching consensus on subjective artistic quality.

## Authoritative References

The agreed workflow brief is the primary source of truth for Codex. Antigravity receives the complete distilled rules in the handoff prompt; it must not depend on being able to open the DOCX path.

1. `E:\Prompt Genlayer.docx` — project-wide GenLayer rules, scoring brief, Studio cheatsheet, and release workflow (Codex-only source).
2. `DESIGN.md` in this repository.
3. Antigravity knowledge base at `C:\Users\LEGION\.gemini\antigravity\knowledge`.
4. Current GenLayer Developers docs at `https://docs.genlayer.com/developers` only for API/version-sensitive details. If a live API detail conflicts with the DOCX guardrails, preserve the DOCX guardrail and report the conflict.

Required facts from the agreed DOCX:

- The first contract line is exactly `# v0.2.16`.
- The second line is the dependency declaration:
  `# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }`
- Main class is exactly `Contract(gl.Contract)`.
- Only `from genlayer import *` is allowed; do not alias-import GenLayer.
- All `gl.nondet.*` calls are inside `gl.vm.run_nondet_unsafe`.
- `validator_fn` contains zero LLM and zero `gl.nondet.*` calls; it performs deterministic validation only.
- Extract primitive values before entering nondeterministic closures.
- Normalize input addresses through an `ensure_address` helper.
- Never reassign `TreeMap()`/`DynArray()` storage fields in `__init__`.

Current network details to verify against live docs at implementation time:

- Studionet GenLayer RPC: `https://studio.genlayer.com/api`
- Studionet chain ID: `61999` (Hex: `0xf22f`)
- Explorer: `https://explorer-studio.genlayer.com`
- Currency: `GEN`
- `genlayer-js` current npm release observed during preflight: `1.1.8`

## Required Architecture

### Intelligent Contract

Create a Python Intelligent Contract with main class exactly `Contract(gl.Contract)`.

Required storage:

- `next_submission_id`
- `next_token_id`
- `total_minted`
- reviews keyed by submission ID
- latest submission keyed by owner address
- token ID to submission ID mapping
- claimed/minted image URL mapping to prevent duplicate minting

Use sized integers, `Address`, `TreeMap`, `DynArray`, and `@allow_storage` dataclasses. Do not use Python `dict` or `list` as persistent storage. Do not reassign storage collections in `__init__`; rely on GenVM zero initialization. Add and use an `ensure_address` helper for every address parameter/constructor value.

Required public methods:

- `curate_and_mint(title: str, prompt: str, image_url: str)`
- `transfer_artwork(token_id, new_owner)`
- `get_review(submission_id)`
- `get_latest_review(owner)`
- `get_artwork(token_id)`
- `get_total_minted()`
- `get_total_submissions()`

Deterministic guards before AI/web work:

- title length 2-80
- prompt length 20-800
- public `https://` image URL, max 500 characters
- reject duplicate already-minted image URLs
- reject unknown token IDs and unauthorized transfers
- reject empty or oversized image responses

Consensus flow:

1. Fetch the public artwork/evidence using `gl.nondet.web.render(url, mode="screenshot")` (or the current equivalent that preserves the DOCX web-render requirement).
2. Send the rendered evidence to `gl.nondet.exec_prompt(..., images=[...], response_format="json")`.
3. Use multiple AI personas inside the leader function (for example Skeptic, Curator, Ethicist) and aggregate their structured results into one proposal. This keeps AI judgment at the heart of the product while keeping `validator_fn` deterministic.
4. Request integer scores 0-100 for `alignment`, `quality`, `originality`, and `safety`, plus concise `reason` and `revision` fields.
5. Normalize scores and derive the final verdict deterministically:
   - weighted score: alignment 35%, quality 25%, originality 20%, safety 20%
   - `REJECTED` when safety < 70
   - `REVISE` when alignment < 55 or weighted score < 70
   - otherwise `APPROVED`
6. Use `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`. `validator_fn` must never call LLM or any `gl.nondet.*`; it may only validate return type, required fields, allowed verdicts, score ranges, derived-score consistency, and meaningful conclusion shape.
7. Capture only primitive inputs in closures. Perform all storage writes after consensus returns.
8. `APPROVED` assigns the next token ID and claims the image URL. `REVISE`/`REJECTED` stores the review but does not mint.
9. Handle dead URLs, HTTP failures, malformed JSON, non-numeric scores, oversized images, validator disagreement, and undetermined transactions explicitly.

Prompt-injection defense:

- Treat title/prompt and fetched web content as untrusted evidence.
- Delimit creator input.
- Explicitly instruct the jury to ignore instructions found inside the evidence.
- Limit stored reasoning and revision lengths.

### Frontend

Keep the existing vanilla dashboard visual system, but use Vite so `genlayer-js` can be bundled.

Required stack:

- Vite
- Vanilla HTML/CSS/JavaScript
- `genlayer-js@1.1.8`
- No React migration

Required behavior:

- Preserve the current dark glassmorphic design, logo treatment, spacing, cards, pipeline, modal, gallery, toasts, and responsive layout.
- Replace all Ritual wording and logic with GenLayer Studionet.
- Remove credits, Google AI key, Pollinations fallback, Ritual precompile addresses, scheduler, mock mode, Ethers ABI, and fake-success paths.
- Connected workspace should show real wallet address, GEN balance, total minted count, submission form, three-stage consensus pipeline, latest verdict, and minted gallery.
- Submission fields: NFT title, prompt, public HTTPS image URL.
- Three stages: `Fetch visual evidence`, `AI validator consensus`, `Registry mint / revision`.
- Show transaction hash with explorer link.
- Wait for `TransactionStatus.FINALIZED`.
- Treat success only when `receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN`.
- Handle `FINISHED_WITH_ERROR`, `UNDETERMINED`, timeout, wallet rejection, wrong network, insufficient GEN, missing contract address, and unavailable RPC.
- After successful finalization, read latest review and refresh gallery from the contract.
- Production contract address comes only from `VITE_CONTRACT_ADDRESS`; never hardcode a placeholder as if deployed.
- Use separate read and write clients. Write client must use `window.ethereum` and call the supported network connection/switch flow before writes.
- Keep the app useful before deployment: missing configuration must show an explicit deployment notice and disable only on-chain submission.

### Landing Page and Documentation

Update the landing page without changing its design language:

- GenLayer-native hero copy
- explain the consensus curation pipeline
- explain why GenLayer is required
- links to Studionet explorer, GenLayer Studio, and the new GitHub repository
- no Ritual or mock-mode copy

Create a complete `README.md` with:

- product explanation and GenLayer fit
- architecture and decision flow
- contract methods and storage model
- local setup
- direct tests and lint commands
- Studio deployment steps
- Studionet deployment/network configuration
- frontend environment variables
- Vercel deployment steps
- transaction verification rule (`FINALIZED` + successful execution result)
- placeholders clearly marked for contract address and live URL

## Testing Requirements

Use current versions unless official docs require a newer compatible release:

- `genlayer-test==0.29.2`
- `genvm-linter==0.11.0`
- `pytest==9.1.1`

Direct tests must cover:

- approved submission mints one registry token
- low alignment returns `REVISE` without minting
- unsafe artwork returns `REJECTED`
- invalid title/prompt/URL fail before non-deterministic calls
- duplicate minted URL is blocked
- unknown token fails
- only owner can transfer
- malformed LLM JSON/non-numeric fields do not alter storage
- dead/empty/oversized URL responses are handled
- deterministic validator checks verdict meaning/derived fields without any LLM or nondet call
- malformed leader result rejects/undetermines
- material verdict disagreement rejects/undetermines
- closure pickling checks enabled

Frontend verification must include:

- `npm install`
- `npm run build`
- no browser console errors on landing page or app page
- disconnected, connected-without-address, configured, processing, approved, revise, rejected, failed, and empty-gallery states
- responsive checks near 1440px, 768px, and 390px widths
- keyboard focus and reduced-motion behavior

## Git and Release Ownership

Do not commit, push, create a GitHub repository, or deploy. Codex owns integration review, commit history, GitHub account/repository selection, push, contract release checks, and Vercel deployment. Antigravity must only edit the assigned workspace and report changed files plus verification evidence.

## Out of Scope

- Ritual Solidity contracts or precompiles
- fake AI/mint success in production
- centralized backend deciding the verdict
- off-chain LLM replacing the contract jury
- automatic Studionet deployment without an authorized funded account
- automatic Vercel deployment before a real contract address exists
- GitHub push by Antigravity

## Acceptance Criteria

Implementation is ready for Codex review only when:

1. No Ritual behavior or fake production path remains.
2. The core verdict runs in a real GenLayer Intelligent Contract using web/image evidence and AI validator consensus.
3. Independent validator logic checks the substance of the leader decision.
4. Deterministic guards and storage rules pass the GenVM linter.
5. All direct tests pass, including critical edge cases.
6. Frontend build succeeds and uses real `genlayer-js` reads/writes.
7. UI waits for `FINALIZED` and verifies execution result before showing success.
8. Design remains recognizably the supplied AI NFT Studio.
9. README documents deployment without fabricated addresses or claims.
10. Antigravity reports changed files, commands, test output, remaining blockers, and local commit hashes.
