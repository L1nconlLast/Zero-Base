# Stable Shell Runtime Release

## Root causes fixed

1. Forced gate into `MvpAppShell` in the authenticated app flow.
2. `useLocalStorage` render loop when `initialValue` changed by reference.
3. Vercel serverless ESM imports in `api/` without `.js` extensions.
4. Public aliases still pointing to an older deployment after the validated fix.

## Evidence

- Local backend audit passed with the unified `api/` contract.
- Local real-shell smoke passed `10/10`.
- Published MVP API flow passed on the corrected deployment.
- Published real-shell smoke passed `10/10`.

## Final status

- Local: `PASSOU`
- Published/Vercel: `PASSOU`

## Stable reference

- Validated deployment: `dpl_GUY2jJNWbBeLh6yUJmRZn4iyjd8E`
- Public alias moved to the validated deployment on March 25, 2026.
