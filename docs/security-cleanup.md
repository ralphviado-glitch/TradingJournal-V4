# Security Cleanup

## What Was Found

- `.env` exists locally but is not tracked by Git.
- Local `.env` contains `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variable names. Values were not copied into documentation.
- No tracked `.env` files were found.
- A local Git history scan for obvious Supabase/service-role/password/token patterns returned no matches in tracked files.

## Changes Made

- Added `.env` and `.env.*` to `.gitignore`.
- Added `.env.example` with safe placeholders only.
- Supabase client setup now warns when required Vite env vars are missing.

## Credential Rotation

No service-role key, database password, or private token was found in the local repository scan. Credential rotation is not indicated by the local evidence.

Rotate credentials if:

- A real service-role key was ever pasted into source outside this local scan.
- `.env` was previously committed in another branch or remote not present locally.
- Supabase logs show suspicious access.

## Recommended Verification Commands

```bash
git ls-files .env .env.*
git log --all --oneline -- .env .env.local .env.production
git grep -n -I -E "(SUPABASE|SERVICE_ROLE|service_role|PASSWORD|TOKEN|SECRET|PRIVATE|postgres://|postgresql://)" $(git rev-list --all)
```

## History Rewriting

History rewriting is not currently required based on this local scan.

If a secret is later found in Git history:

```bash
git filter-repo --path path/to/secret-file --invert-paths
git push --force-with-lease origin your-branch
```

Coordinate before rewriting shared history, and rotate the exposed credential immediately.
