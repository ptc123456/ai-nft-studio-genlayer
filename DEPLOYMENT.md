# Studionet Deployment Evidence

## Reviewed contract

- Network: GenLayer Studionet
- Contract: [`0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F`](https://explorer-studio.genlayer.com/address/0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F)
- Deployment transaction: [`0x26f3040e201df07c36bbe68f026dc09663d5fd632036ebecd44c1aecde382c51`](https://explorer-studio.genlayer.com/tx/0x26f3040e201df07c36bbe68f026dc09663d5fd632036ebecd44c1aecde382c51)
- Deployer: `0x277bf20771129ae224042d23b0311c1ac5a9ac1b`
- Constructor arguments: none
- Deployment classification: `INTENTIONALLY FROZEN`
- Reviewed source commit: `90ceadbc64f8e844b6956b9e131fd07bb9ae54da`
- Local and deployed source SHA-256: `1763a0d160c388c9f09362cf4dd7116c28f6887587e18b73b253debbedc5b2ce`
- Deployment result: `FINALIZED`, execution `SUCCESS`, five validator votes `agree`

The deployed source was read through `gen_getContractCode`, Base64-decoded, hashed, and compared with `contracts/registry.py`. The hashes matched exactly. The initial readback returned `get_total_minted = 0` and `get_total_submissions = 0`.

## Live method evidence

The first write used a valid JPEG that the current Studionet vision route rejected as `INVALID_IMAGE`. Transaction [`0x84caa6253303a881a8039fbadddce49c8b8474146c2e22008d9e68ac1dcd0b86`](https://explorer-studio.genlayer.com/tx/0x84caa6253303a881a8039fbadddce49c8b8474146c2e22008d9e68ac1dcd0b86) finalized with an execution rollback. State remained unchanged at zero submissions and zero minted tokens.

A second write used a verified PNG. Transaction [`0xe95b9f72e473c06c1797af123e52e9179463752f48682f98cd1a62763f8fc6a9`](https://explorer-studio.genlayer.com/tx/0xe95b9f72e473c06c1797af123e52e9179463752f48682f98cd1a62763f8fc6a9) reached `FINALIZED`, execution `SUCCESS`, and `MAJORITY_AGREE` with three agree and two disagree votes. The deterministic thresholds stored a `REVISE` verdict with token ID `0`.

Post-write readback:

- `get_total_submissions = 1`
- `get_total_minted = 0`
- `get_review(1).verdict = REVISE`
- `get_review(1).artwork_hash = keccak256:399a8335aef0f6d990e437896b19630be57dd77a60a9dfcb08c0005d4322cf9a`
- Stored owner: `0x277bF20771129ae224042d23b0311C1AC5a9AC1b`

The image endpoint now normalizes generated media to PNG before public Blob storage. This frontend/server revision is not represented by the frozen contract source and does not alter its address or storage.

## Recovery boundary

This instance is intentionally treated as frozen. A contract defect requires a newly reviewed source revision, a new Studionet deployment, and an explicit configuration migration. Frontend or media-pipeline defects can be corrected and redeployed without changing this contract address, provided the evidence URL remains public HTTPS input accepted by the existing contract.
