# Task List — GenLayer Studionet Migration

## 1. Completed Tasks
- `[x]` Migrate frontend client config in `app.js` to Studionet.
- `[x]` Update HTML layouts `index.html` and `app.html` to reference Studionet.
- `[x]` Configure `.env` and `.env.example` with the real deployed contract address.
- `[x]` Update specifications and guidelines: `SPEC.md` and `ANTIGRAVITY_PROMPT.md`.
- `[x]` Update documentation: `README.md` and `walkthrough.md`.
- `[x]` Perform linter, pytest, Vite build, and legacy reference verification checks.
- `[x]` Update `task.md` to completed.

## 2. Pending Tasks
- None.

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
   .venv\Scripts\python.exe -m pytest -q
   ```

3. **Frontend Build**:
   ```bash
   npm run build
   ```

4. **Legacy Network Reference Scan**:
   ```bash
   Run a repository scan over frontend, contracts, tests, package.json, .env.example, README.md, SPEC.md, ANTIGRAVITY_PROMPT.md, walkthrough.md, task.md, and gltest.config.yaml to confirm no deprecated network configuration remains.
   ```
