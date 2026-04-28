## Goal
Rebuild TenCheck into a fully connected rental operating system with the lifecycle:
**Property → Application → Approval → Tenancy → Payment → Reputation → Reporting**, replacing the broken/scattered flows.

This plan focuses on **wiring the modules together** (apply from listing, auto-tenancy on vacancy, contextual messaging, payment linked to tenancy, admin verification queue, account-status enforcement, landlord reports). It does **not** rip out existing tables — it adds new fields/triggers/routes that connect what's already there.

---

## 1. Database migration (single migration)

**Schema additions**
- `properties`: add `total_units int default 1`, `occupied_units int default 0`.
- `property_applications`: add `apply_source text default 'direct'`, ensure `application_status` supports `'auto_approved'`.
- `profiles`: add `tenant_verification_status text default 'unverified'` (`unverified | landlord_verified | admin_verified`), `account_status text default 'active'` (`active | suspended | deleted`) — backfill from existing `is_suspended` / `deletion_status`.
- New table `verification_queue (id, user_id, role, status pending|approved|rejected, submitted_at, reviewed_by, reviewed_at, notes)` with admin-only RLS + owner-read.
- `rent_transactions`: add `tenancy_id uuid` (nullable for legacy rows).
- `threads`: add `tenancy_id uuid` and `application_id uuid` (nullable).

**RLS additions**
- `verification_queue`: owner can insert/select own row; admin can select/update all.
- `properties` SELECT: hide rows whose landlord profile has `account_status != 'active'`.
- `profiles` SELECT: exclude `account_status='deleted'` from non-admin queries (via revised policy).
- All existing policies remain.

**Triggers / functions**
- `auto_apply_property(_property_id, _tenant_id, _message)` — SECURITY DEFINER RPC the tenant calls. Logic:
  1. Validate tenant role + active.
  2. If `occupied_units < total_units` → insert `property_applications` with `auto_approved`, insert `tenancy_records` (active), increment `occupied_units`, set `is_available=false` when full, set `tenant_verification_status='landlord_verified'`.
  3. Else → insert pending application.
  4. Always: `find_or_create_thread` (tenant+landlord+property), insert system message ("Welcome, your application has been received"), insert notification to landlord.
  5. Returns `{ status, tenancy_id|null, thread_id }`.
- Update existing `handle_application_approval` trigger to also: increment `occupied_units`, set `tenant_verification_status='landlord_verified'`, post system message in the existing thread ("Your application has been approved").
- New `find_or_create_property_thread(_tenant_id,_landlord_id,_property_id)` helper that returns thread id and inserts both participants.
- New `record_tenancy_payment(_tenancy_id,_amount,_method,_code)` RPC: derives `landlord_id`/`property_id` from tenancy, inserts `rent_transactions` (status pending), posts system message "Tenant reported payment of KES X", returns row.
- New `confirm_tenancy_payment(_txn_id)` RPC: landlord-only on their txn, sets `confirmed`, posts "Payment confirmed" system message, calls `calculate_tenant_score`.
- Trigger on `profiles` UPDATE: when `account_status='deleted'` or `'suspended'`, also flip `is_suspended`/`deletion_status` for back-compat and (for deleted) hide their properties (`is_available=false`).
- Auto-verify tenant trigger: on first `tenancy_records` insert for a tenant with verified email + phone, set `tenant_verification_status='landlord_verified'` if still `unverified`.

**Credit score simplification**
- Update `calculate_tenant_score` to: `score = round(on_time / total * 100)` over `rent_transactions` where `verification_status='confirmed'` (on_time = paid by `payment_date` ≤ first of month). Drop service-request bonus. Keep RLS access guard.

---

## 2. Edge function updates

`supabase/functions/record-payment/index.ts`
- Replace `record` action to require `tenancy_id`; call new `record_tenancy_payment` RPC. Reject if tenancy doesn't belong to caller.
- Add `confirm` action calling `confirm_tenancy_payment` (landlord-only).
- Keep wallet actions but require tenancy_id for `wallet-pay`.

---

## 3. Routing & access control (`src/App.tsx`, `src/contexts/AuthContext.tsx`)

- Auth gate: on session load, check `profile.account_status`. If `suspended` or `deleted`, sign out + toast and block dashboard routes.
- Add `/properties/:id/apply` route → new `ApplyDirect.tsx` (token-less direct apply from listing).
- Keep existing `/apply/:token` flow.

---

## 4. Frontend: Property → Apply → Message

**`src/pages/PropertyDetail.tsx`**
- Remove `inquiries` insert. Replace with two buttons:
  - **Apply Now** → if no user → `/login?redirect=/properties/:id/apply`; else navigate to `/properties/:id/apply`.
  - **Message Landlord** → opens dialog; on send, calls a new helper that uses `find_or_create_property_thread` RPC then inserts message; navigates to `/dashboard?tab=messages&thread=…`.

**`src/pages/ApplyDirect.tsx` (new)**
- Tenant-only form: name, phone, email (prefilled from profile), national_id (optional), short message.
- Calls `auto_apply_property` RPC.
- If `auto_approved` → success screen "You're now a verified tenant of this property" + link to dashboard.
- If `pending` → success screen "Application sent — landlord will respond" + link to thread.

**Signup (`Signup.tsx`)**
- After signup, auto-create `verification_queue` row (status pending) for landlord/worker roles. Tenants stay `unverified` until first tenancy.

---

## 5. Landlord dashboard (`src/pages/Dashboard.tsx`)

Reorganize landlord groups (replace current `landlordGroups`):
- **Overview**: Properties, My Tenants (new), Reports (new)
- **Applications**: Applications (existing panel — show all from `property_applications`, not just from links), Share Links
- **Communication**: Messages, Notifications
- **Payments**: Payment History (rename), Confirm Payments (new view filtering pending txns)
- **Moderation**: Disputes

Drop redundant items: Search Tenant (replaced by contextual search inside My Tenants), Inquiries (replaced by Messages), separate Tenancies (folded into My Tenants).

**New components** in `src/components/dashboard/`:
- `MyTenantsPanel.tsx` — list active tenancies for landlord; per-row: tenant name, property, rent, payment history (last 5 txns), open thread button, complaints count, contextual search input (name/email/phone over tenants who applied).
- `ReportsPanel.tsx` — counts via Supabase queries: total applications, approved, rejected, occupancy_rate (sum occupied/total across landlord's properties), payment_consistency (% confirmed/total over last 90d), complaints. Render as stat cards + simple bar.
- `ConfirmPaymentsPanel.tsx` — pending `rent_transactions` for landlord with Confirm/Dispute buttons calling edge function.

**Property form**: add `total_units` input (default 1).

**Application approval**: existing `ApplicationsPanel.tsx` already calls update; trigger handles tenancy + thread + verification automatically. No frontend change needed beyond surfacing all applications (remove the link-only filter — already not filtered, good).

---

## 6. Tenant dashboard (`src/pages/Dashboard.tsx`)

Reorganize tenant groups:
- **Housing**: Browse Houses, My Tenancies
- **Payments**: Pay Rent (new selector), Payment History
- **Reputation**: Credit Passport
- **Communication**: Messages, Notifications
- **Account**: My Profile

Drop: Services, My Disputes (kept inside tenancy detail), separate Wallet.

**`RentPaymentPanel.tsx` rewrite (tenant)**
- Replace landlord-by-phone lookup with a `<Select>` of the tenant's active tenancies (label: property — landlord — KES rent).
- On submit: call edge function `record-payment` with `{action:'record', tenancy_id, amount, method, code}`. Backend derives landlord/property.
- Show recent transactions with status badges.

---

## 7. Messaging (contextual, 1:1)

`MessagingHub.tsx` `NewThreadForm`
- Replace "find by phone" with a contextual recipient list:
  - Tenant: landlords from their tenancies + landlords whose properties they applied to.
  - Landlord: tenants from their applications + active tenancies.
- On select, call `find_or_create_property_thread` RPC (or tenancy variant) so threads are auto-deduplicated and linked to property/tenancy.

System messages (welcome, approval, payment-reported, payment-confirmed) are inserted server-side via triggers/RPCs above.

---

## 8. Admin dashboard (`src/pages/AdminDashboard.tsx`)

Verification tab additions:
- Show `verification_queue` rows (pending) with user details + role.
- Approve → updates queue row + sets `tenant_verification_status='admin_verified'` (or analogous landlord field already in `landlord_verification`).
- Reject → updates queue row + system notification to user.

Account moderation: existing suspend/delete buttons now write `account_status` (trigger keeps legacy fields in sync).

---

## 9. Account status enforcement

- `AuthContext`: after fetching profile, if `account_status='suspended'` show toast and `signOut()`; if `deleted`, sign out and redirect `/`.
- Login (`Login.tsx`): block sign-in for non-active accounts before navigating.
- Property/Profile SELECT policies updated as above so deleted users disappear from listings/search.

---

## 10. Real-time

Existing dashboard subscribes to `notifications` and `service_requests`. Add subscriptions to `messages` (invalidate thread query), `property_applications` (landlord), `rent_transactions` (both parties).

---

## 11. Files to create / edit

**Create**
- `supabase/migrations/<ts>_rental_os_rebuild.sql` (schema, triggers, RPCs, RLS)
- `src/pages/ApplyDirect.tsx`
- `src/components/dashboard/MyTenantsPanel.tsx`
- `src/components/dashboard/ReportsPanel.tsx`
- `src/components/dashboard/ConfirmPaymentsPanel.tsx`

**Edit**
- `src/App.tsx` (route + status gate)
- `src/contexts/AuthContext.tsx` (status enforcement)
- `src/pages/Dashboard.tsx` (nav groups + new tabs render)
- `src/pages/PropertyDetail.tsx` (Apply + Message buttons; remove inquiries)
- `src/pages/AdminDashboard.tsx` (verification queue UI; account_status writes)
- `src/pages/Login.tsx` / `src/pages/Signup.tsx` (status checks; auto-queue rows)
- `src/components/dashboard/RentPaymentPanel.tsx` (tenancy-driven payment)
- `src/components/dashboard/MessagingHub.tsx` (contextual recipients)
- `src/components/dashboard/ApplicationsPanel.tsx` (minor: status badge for `auto_approved`)
- `src/components/dashboard/TenancyManager.tsx` (read-only tenant-side view; remove landlord manual create form — tenancies now system-created)
- `supabase/functions/record-payment/index.ts` (tenancy_id + confirm via RPC)

---

## 12. Out of scope (intentionally)

- Service worker dashboard remains untouched (per earlier user instruction not to modify it beyond what's needed). Worker verification queue entry is added at signup but managed via existing admin flows.
- No new payment provider; existing M-Pesa code/parser stays.
- No WebSockets server — Supabase Realtime continues to handle live updates.

---

## Risks & notes
- `total_units` defaulted to 1 means all existing properties become "1 unit, 0 occupied" — vacancy logic still works.
- Legacy `rent_transactions` without `tenancy_id` remain readable; only new payments require it.
- Trigger updates to `handle_application_approval` are additive — existing approved-app records are unaffected.
- The migration is large but idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`).