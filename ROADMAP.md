# Submission Roadmap

This roadmap separates the current release candidate from future work. It does not claim adoption, partnerships, or integrations that have not been verified.

## V1 Delivered

The repository contains a complete prompt-to-registry flow: a Vercel Function requests a square image from Pollinations FLUX, stores it in Vercel Blob, and returns a public HTTPS evidence URL. The browser connects to GenLayer Studionet with `genlayer-js`, submits `curate_and_mint`, follows the transaction through finalization and execution verification, reads review and registry state, renders the gallery, and supports owner-authorized transfers.

The Python Intelligent Contract fetches the submitted image bytes, binds the review to their Keccak-256 digest, evaluates prompt alignment, quality, originality, and safety with a structured jury task, and stores an `APPROVED`, `REVISE`, or `REJECTED` record. Validators independently repeat the byte fetch, hash check, and jury evaluation. They must agree on the exact content identity, verdict, and threshold conclusions, while bounded score tolerance handles nondeterministic variation. Approved submissions receive a native registry token ID.

The source is covered by 44 Python contract tests and 8 frontend tests. GenVM lint/validation and the Vite production build are part of the verification workflow.

The reviewed contract is deployed on Studionet at `0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F`. `DEPLOYMENT.md` records deployment source parity and live `FINALIZED` + `SUCCESS` evidence for image-grounded `APPROVED`, `REVISE`, and `REJECTED` outcomes plus ownership transfer. Current readback contains four submissions, one minted registry token, and the transferred owner. The public Vercel app is deployed with the reviewed contract address, and its production JavaScript asset matches the local production build byte for byte.

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
| Core-flow completion | Image-grounded `APPROVED`, `REVISE`, and `REJECTED` writes plus transfer reached `FINALIZED` + `SUCCESS` | Establish a baseline from real product sessions | Submitted sessions reaching verified `FINALIZED` + `SUCCESS` and matching readback |
| Contract execution reliability | Accepted state has four submissions and one mint; documented diagnostics include image-format rollback, host-rate-limit rollback, and one finalized `MAJORITY_DISAGREE` outcome | Track and reduce failed or non-accepted writes | Successful executions divided by submitted writes, classified by failure reason |
| Curation volume | Four stored reviews: one approved mint, two revisions, and one rejection | Record the approved/revise/rejected distribution as real usage grows | `get_total_submissions`, `get_total_minted`, and stored verdicts |
| Validator agreement | All advertised terminal verdicts have accepted consensus evidence; one complex rejection image produced a finalized `MAJORITY_DISAGREE` transaction before a simpler image reached consensus | Monitor consensus retries and evidence complexity | Transaction receipts, validator votes, and unchanged-state checks after failures |
| Processing time | Not measured | Establish median and tail latency | Time from transaction hash to verified finalization |
| Contributor activity | No claim | Track external issues and reviewed contributions | Public repository activity |
| Active integrations | FLUX generation, Vercel Blob, GenLayer Studionet client, and the production frontend are configured in the live release | Monitor each dependency in production | Synthetic checks and successful end-to-end sessions |

Targets requiring numeric thresholds should be set only after a measured pilot baseline.

## Future Updates

### Phase 1 - Operational Reliability

- **Problem:** image generation, public evidence hosting, and nondeterministic consensus can fail for different operational reasons that users need to distinguish.
- **User value:** creators receive clearer recovery guidance without mistaking a failed execution or disagreement for a successful mint.
- **Planned work:** classify production failures, add bounded retry guidance, and measure generation, hosting, finalization, and consensus latency separately.
- **Dependencies:** production observability, privacy-safe event definitions, and enough real sessions to establish a baseline.
- **Success signal:** measured completion and failure rates with each unsuccessful request assigned to a reproducible category.
- **Priority:** highest, because the live release should establish reliability before adding new storage or token integrations.

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
