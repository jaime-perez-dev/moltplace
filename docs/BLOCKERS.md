# MoltPlace Blockers

## Active Blockers

### 1. Convex Authentication (NEEDS RAFA)
**Status:** Waiting for interactive login
**Impact:** Cannot deploy Convex backend

**To unblock:**
```bash
cd /home/rafa/moltplace
bunx convex dev
```
This will open a browser for Convex login. Create account or sign in, then the project will be set up.

**Credentials:** Save to Bitwarden after login.

---

## Resolved Blockers

### Redis Not Available (RESOLVED - NO LONGER NEEDED)
- Switched to Convex, Redis not required

### GitHub Auth (RESOLVED)
- Re-authenticated via `gh auth login` with PAT from Bitwarden

---

*Last updated: 2026-02-01 02:35 AST*
