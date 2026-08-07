# Submission Roadmap

This roadmap separates the current release candidate from future work. It does not claim adoption, partnerships, or integrations that have not been verified.

## V1 Delivered

The repository contains a complete prompt-to-registry flow: a Vercel Function requests a square image from Pollinations FLUX, stores it in Vercel Blob, and returns a public HTTPS evidence URL. The browser connects to GenLayer Studionet with `genlayer-js`, submits `curate_and_mint`, follows the transaction through finalization and execution verification, reads review and registry state, renders the gallery, and supports owner-authorized transfers.

The Python Intelligent Contract fetches the submitted image bytes, binds the review to their Keccak-256 digest, evaluates prompt alignment, quality, originality, and safety with a structured jury task, and stores an `APPROVED`, `REVISE`, or `REJECTED` record. Validators independently repeat the byte fetch, hash check, and jury evaluation. They must agree on the exact content identity, verdict, and threshold conclusions, while bounded score tolerance handles nondeterministic variation. Approved submissions receive a native registry token ID.

The source is covered by 44 Python contract tests and 8 frontend tests. GenVM lint/validation and the Vite production build are part of the verification workflow.

The reviewed contract is deployed on Studionet at `0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F`. Deployment source parity, `FINALIZED` status, `SUCCESS` execution, initial state, and a successful live `REVISE` write with state readback are recorded in `DEPLOYMENT.md`. The public Vercel app still requires redeployment before submission evidence is complete.

## Target Users

The initial users are digital artists and GenLayer developers who want a transparent review record for prompt-generated artwork. Creators need understandable feedback and a consistent acceptance rule. Reviewers and collectors need evidence that the platform operator did not privately choose or rewrite the verdict. The product is intended for small, testable creation sessions rather than high-volume marketplace trading in V1.

## Adoption Approach

Initial discovery can come from a public GenLayer submission, repository documentation, live demos, and GenLayer developer or digital-art communities. A first-time user can generate one image, submit the wallet transaction, observe consensus finalization, and inspect the stored review through the app and Explorer. Continued use should be evaluated from real completion and failure data before adding marketplace or community-governance features. No current user base, partnership, or traction is claimed.

## Planned Integrations

- **Durable media mirroring:** IPFS or Arweave could improve long-term availability of bytes already identified by the on-chain Keccak-256 digest. This requires a verified upload pipeline, gateway reliability checks, and contract-compatible retrieval.
- **Wallet and Explorer deep links:** richer wallet support and transaction-specific Explorer links would make review and transfer verification easier. This requires confirmed Studionet wallet capabilities and stable Explorer URL formats.
- **Exportable NFT standards:** a future EVM-compatible mint or bridge could make approved registry records usable outside this contract. This requires a clear token standard, metadata integrity design, bridge security review, and explicit separation from the native V1 registry.
- **Model/provider diversity:** future jury strategies could compare supported models or evidence-grounded prompts to reduce correlated model failures. This requires current GenLayer-supported APIs, cost and latency testing, and equivalence rules that preserve deterministic settlement thresholds.

These are proposed integrations, not delivered V1 features.

## Success Metrics

No production usage metrics are claimed. After the corrected deployment, the project should measure:

| Metric | Current evidence | Initial target | Measurement |
| --- | --- | --- | --- |
| Core-flow completion | One live curation reached `FINALIZED` + `SUCCESS` and stored `REVISE` | Establish a baseline from real trials | Submitted sessions reaching verified `FINALIZED` + `SUCCESS` |
| Contract execution reliability | One JPEG write rolled back; one PNG write succeeded | Track and reduce failed/undetermined writes | Successful executions divided by submitted writes |
| Curation volume | One stored `REVISE`; zero minted tokens | Record initial approved/revise/rejected distribution | `get_total_submissions` and stored verdicts |
| Validator agreement | Live PNG write: three agree, two disagree, accepted | Monitor consensus retries and failures | Transaction receipts and contract/validator logs |
| Processing time | Not measured | Establish median and tail latency | Time from transaction hash to verified finalization |
| Contributor activity | No claim | Track external issues and reviewed contributions | Public repository activity |
| Active integrations | FLUX generation, Vercel Blob, GenLayer Studionet client | Validate each dependency in production | Synthetic checks and successful end-to-end sessions |

Targets requiring numeric thresholds should be set only after a measured pilot baseline.

## Future Updates

### Phase 1 - Live Release and Operational Reliability

- **Problem:** the reviewed contract is deployed, but the public frontend has not yet been redeployed against it and live vision-model behavior varies.
- **User value:** reviewers and creators can verify that the live app uses the same contract version documented in the repository and handles incompatible generated image formats safely.
- **Planned work:** redeploy the PNG-normalizing frontend, verify the production bundle address, capture a real product screenshot, and measure generation/consensus failures.
- **Dependencies:** Vercel configuration, linked Blob storage, and post-deployment parity checks.
- **Success signal:** source, README, Explorer, and live app all reference the same contract and a generated PNG reaches a verified on-chain verdict.
- **Priority:** highest, because it closes the current submission-evidence gap.

### Phase 2 - Durable Evidence

- **Problem:** the current digest proves content identity but a public Blob URL does not guarantee permanent availability.
- **User value:** the exact adjudicated media remains retrievable through more than one storage path.
- **Planned work:** evaluate IPFS or Arweave mirroring for content already identified by the stored digest.
- **Dependencies:** renderable gateway strategy, storage-cost evaluation, contract migration plan, and new tests.
- **Success signal:** stored evidence identifiers resolve reliably and detect changed content.
- **Priority:** second, because evidence integrity strengthens the existing trust model.

### Phase 3 - Usability and Interoperability

- **Problem:** the native registry is not a marketplace standard and the current UX provides limited historical analytics.
- **User value:** creators can understand prior verdicts and optionally use approved records in broader ecosystems.
- **Planned work:** review history filters, clearer retry guidance, accessibility improvements, and a separately reviewed export or bridge design.
- **Dependencies:** real user feedback, measured contract activity, token-standard decision, and security review.
- **Success signal:** higher measured core-flow completion and at least one verified external integration.
- **Priority:** third, because it should follow a reliable and evidence-complete V1.
