I found several likely causes and related problems around authentication, database triggers, and deployment routing. The visible “failed to fetch” happens before the app can complete sign-in; the backend logs also show refresh-token failures, but no recent auth request was recorded for the failed login attempt, which strongly suggests the request is not successfully reaching the auth API from the current deployed/preview client.

Plan to fix it:

1. Replace the fragile environment fallback setup
- Remove the hardcoded Lovable Cloud values from `vite.config.ts`.
- Keep the standard generated client import pattern, but add a safe runtime validation layer outside the generated client so deployed builds fail with a clear setup message instead of a generic `failed to fetch`.
- Keep `.env.example` for GitHub/self-hosting so Vercel/Netlify users know exactly which public variables must be configured.
- Add a small auth connectivity diagnostic helper used by Login/Signup to detect whether the auth endpoint is reachable and show a precise message like “Backend URL/key missing or unreachable” instead of `failed to fetch`.

2. Repair authentication flow and routing
- Refactor `AuthContext.tsx` so profile loading is reliable and returns profile status/role in one place.
- Avoid duplicated profile checks in `Login.tsx`; use the auth context and one shared post-login redirect function.
- Add protected route wrappers:
  - unauthenticated users go to `/login?redirect=...`
  - admins go to `/admin`
  - service workers go to `/worker-dashboard`
  - tenants and landlords go to `/dashboard`
- Make login redirect deterministic after profile/admin-role lookup, including the system admin account.
- Ensure signup preserves redirect links from property application flows.

3. Fix database issues that can break signup/workflows
- Add a migration to make the `handle_new_user` trigger idempotent with `ON CONFLICT (user_id) DO UPDATE`, so signup/profile creation cannot fail if a profile already exists or if metadata changes.
- Keep roles immutable after signup in the application UI, but ensure the database trigger accepts the valid MVP roles: `tenant`, `landlord`, `service_worker`.
- Add/repair missing workflow triggers found in the live database:
  - ensure only one application-approval trigger exists, preventing duplicate tenancy creation
  - remove duplicate message-notification triggers that currently can create duplicate notifications
- Add account-status consistency so admin suspension/deletion updates both `account_status` and legacy flags.

4. Fix dashboard-to-dashboard communication
- Add or repair a server-side function for creating/looking up communication threads between users so modules do not rely on fragile direct client inserts.
- Update `MessagingHub` to use this function for new conversations and invalidate/refetch threads/messages correctly.
- Add realtime invalidation for applications, tenancies, rent transactions, messages, and notifications so tenant/landlord/worker/admin dashboards stay synchronized.

5. Fix security findings that touch the same flow
- Replace the fully public `application_links` SELECT policy with a safer token-lookup RPC so public application links still work without exposing all tokens.
- Restrict worker endorsement notes to authenticated/authorized access instead of fully public reads.

6. Verify behavior before handing back
- Test current auth endpoint reachability from the browser network panel.
- Test login route behavior for a normal tenant/landlord/worker and confirm the system admin routes to `/admin`.
- Test signup with a new account path and verify profile creation.
- Test a property apply flow and confirm tenant/landlord thread and notification communication.
- Confirm the GitHub deployment setup is documented and does not depend on Lovable-only local `.env` injection.