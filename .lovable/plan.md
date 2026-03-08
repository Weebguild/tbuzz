## Investigation: Gossip Alias Shows "Anonymous" Instead of Set Alias

### Root Cause

The user "Pehelwan" (`aa65b115-fe68-463c-9ca7-a9083b070611`) has `anonymous_alias = NULL` in the `profiles` table. The gossip post creation code at line 286 of `Gossip.tsx` does:

```typescript
gossip_alias: profile.anonymous_alias ?? "Anonymous",
```

Since the alias is null, every new post gets "Anonymous". Notably, an older post from this user *does* have `gossip_alias: "Patla_Pehelwaan"`, meaning the alias was set at some point but has since been nulled.

### Why It's NULL

Two possible causes:

1. **Profile edit overwrites**: The `handleSaveProfile` function in `Profile.tsx` (line 449) only updates `display_name`, `bio`, and `avatar_url`. This is fine — it doesn't null the alias.
2. **More likely**: The alias was never persisted during onboarding, or a profile re-creation/update wiped it. The `useAuth` hook fetches `profiles.*` which includes `anonymous_alias`, but if the DB value is null, the client gets null.

### Fixes

DONNOT GIVE USERS OPTION TO CHANGE THEIR GOSSIP ALIAS , once set they can never be changed

**1. Immediate data fix** — Update Pehelwan's alias back to Patla_Pehelwaan in the database using the insert tool.

**3. Add a NOT NULL constraint or default** — Consider adding a database-level default so `anonymous_alias` can never be null (e.g., `DEFAULT 'Anonymous'`). This is a safety net.

### Files to Change

- **Database**: Update the null alias for user `aa65b115-fe68-463c-9ca7-a9083b070611`
- &nbsp;
- `**src/hooks/useAuth.tsx**`: Already fetches `anonymous_alias` via `select("*")` — no change needed