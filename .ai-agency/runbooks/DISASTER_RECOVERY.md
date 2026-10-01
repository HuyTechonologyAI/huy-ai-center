# RUNBOOK: DISASTER RECOVERY
1. Restore database from Supabase WAL / automated daily snapshot.
2. Verify bare-metal Node01 hardware mount at `/mnt/data1`.
3. Check hardware sync status via `sync` and physical block integrity.
4. Re-clone canonical git repositories from GitHub remote.
