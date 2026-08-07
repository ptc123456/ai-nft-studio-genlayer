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

The submitted Studionet instance has now exercised both write methods and every advertised curation terminal verdict. Each successful proof below was checked through the RPC for consensus status, leader execution, validator votes, and contract-state readback.

| Path | Actor and method | Transaction | Verified outcome and readback |
| --- | --- | --- | --- |
| Approved mint | `0x277b...ac1b` -> `curate_and_mint` | [`0xb5d7be40...a929c9`](https://explorer-studio.genlayer.com/tx/0xb5d7be409d20c4bc37bca201270f2b8a7b0c039870b299c6890677be45a929c9) | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`; image-grounded `APPROVED`, token ID `1`, `get_review(2).weighted_score = 85` |
| Ownership transfer | Original token owner -> `transfer_artwork(1, 0x7662...fDF5)` | [`0x75b2f544...c0361b`](https://explorer-studio.genlayer.com/tx/0x75b2f5444afc2cacb98ad69c8e8bfbf28d8ea8608c488873e1bfcba406c0361b) | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`, return `true`, all four validator votes `agree`; `get_artwork(1).owner = 0x76621EFBDDdCfE6C29f3E6361d32caa468abfDF5` |
| Semantic revision | `0x277b...ac1b` -> `curate_and_mint` with a cat image and city prompt | [`0xcc9abd4e...f9a165`](https://explorer-studio.genlayer.com/tx/0xcc9abd4ec832f1b54f10be40d66719b8e67de539c288f64055f3a85eeff9a165) | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`; jury identified the cat/prompt mismatch and stored `REVISE`, alignment `2`, weighted score `45`, token ID `0` |
| Semantic rejection | `0x277b...ac1b` -> `curate_and_mint` with a gun-and-blood warning image | [`0xc1cec9a7...3ac3c2`](https://explorer-studio.genlayer.com/tx/0xc1cec9a74977cdc045f35e42073ebb247fb7ae3dd01033da599ac35ec83ac3c2) | `FINALIZED`, `MAJORITY_AGREE`, leader `SUCCESS`; jury described the violent visual evidence and stored `REJECTED`, safety `9`, token ID `0` |

Current accepted-state readback:

- `get_total_submissions = 4`
- `get_total_minted = 1`
- `get_review(2).verdict = APPROVED`
- `get_review(3).verdict = REVISE`
- `get_review(4).verdict = REJECTED`
- `get_artwork(1).artwork_hash = keccak256:439c5615f24a5889eb6a9d0c60e866b862ad16e91a72be5075aefc1965e36db1`
- `get_artwork(1).owner = 0x76621EFBDDdCfE6C29f3E6361d32caa468abfDF5`

Diagnostic transactions are not counted as successful paths. JPEG transaction [`0x84caa625...dcd0b86`](https://explorer-studio.genlayer.com/tx/0x84caa6253303a881a8039fbadddce49c8b8474146c2e22008d9e68ac1dcd0b86) rolled back after `INVALID_IMAGE`; [`0xb2c33983...2d3a27`](https://explorer-studio.genlayer.com/tx/0xb2c339832e49ad2d1e463ddc54ef361c1b6a3d83343546a8da750c5aa72d3a27) rolled back after an evidence host returned HTTP `429`; and [`0x380c08d6...865e42`](https://explorer-studio.genlayer.com/tx/0x380c08d62871fb08ff3abb5633ba602f9b2a7a6fb014c5483d7735f002865e42) became `UNDETERMINED` after validator score disagreement. All three left accepted state unchanged.

The checked-in image endpoint normalizes generated media to PNG before public Blob storage. This frontend/server revision is not represented by the frozen contract source and does not alter its address or storage. The public Vercel app has not yet been redeployed to this repository revision.

## Reviewer feedback closure

| Reviewer request | Prior problem | Closure evidence |
| --- | --- | --- |
| Bind checked-in configuration to the reviewed contract revision | The repository previously defaulted to a legacy contract address | `.env.example` and `frontend/app.js` now use `0x498b0e2BA30B7b51C708a1304f15C54bdEC9Af3F`; the old address is absent from active source and documentation |
| Prove a fresh image-grounded happy path | Earlier live evidence did not mint an approved token | `0xb5d7be40...a929c9` stored submission `2` as `APPROVED` and minted token `1` |
| Prove the advertised transfer write | Transfer existed in code and tests but lacked live evidence | `0x75b2f544...c0361b` returned `true`; all four validator votes agreed and owner readback changed to `0x7662...fDF5` |
| Prove important non-mint verdicts with semantic image assessment | Earlier `REVISE` evidence reported that no image was available | `0xcc9abd4e...f9a165` stored an image-grounded `REVISE`; `0xc1cec9a7...3ac3c2` stored an image-grounded `REJECTED` |

## Recovery boundary

This instance is intentionally treated as frozen. A contract defect requires a newly reviewed source revision, a new Studionet deployment, and an explicit configuration migration. Frontend or media-pipeline defects can be corrected and redeployed without changing this contract address, provided the evidence URL remains public HTTPS input accepted by the existing contract.
