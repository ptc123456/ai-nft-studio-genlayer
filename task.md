# Task List — AI NFT Studio Release Candidate

## 1. Completed Tasks
- `[x]` Naming is exactly `class Contract(gl.Contract)` with alias `_Contract = Contract`.
- `[x]` Strict `ensure_address` normalization checking rules.
- `[x]` Non-deterministic error handling reverting on-chain transactions.
- `[x]` Deleted `contracts/test_linter_find.py` and configured `pytest.ini`.
- `[x]` Suppressed pytest config warnings with `gltest.config.yaml`.
- `[x]` Vite app.js separate clients (`readClient` and `writeClient`) and status checking rules.
- `[x]` Deletion of `frontend/abis.js` and `frontend/.vercel` directories.
- `[x]` Create complete root README.md with GenLayer curation design and architectural flow details.
- `[x]` Add direct tests `test_low_alignment_returns_revise_without_mint` and `test_unsafe_artwork_returns_rejected_without_mint` to `tests/direct/test_registry.py`.
- `[x]` Refactor `walkthrough.md` to remove any references to HTTP head.
- `[x]` Minor hygiene edits (frontend/.gitignore format, remove `.badge-mock` CSS selector).
- `[x]` Update `task.md` to completed.

## 2. Pending Tasks
- None. All tasks for the release candidate correction round are fully met.

## 3. Blockers
- None.

## 4. Operational Guardrails
- **Anti does not commit/push code.**
- **Anti does not deploy contract.**
- **Anti does not deploy Vercel.**

## 5. Exact Verification Commands

1. **Linter Check**:
   ```bash
   $env:PYTHONIOENCODING="utf-8"
   .venv\Scripts\genvm-lint.exe check contracts\registry.py
   ```

2. **Pytest Run**:
   ```bash
   $env:PYTHONIOENCODING="utf-8"
   .venv\Scripts\python.exe -m pytest -v
   ```

3. **Frontend Build**:
   ```bash
   npm run build
   ```
