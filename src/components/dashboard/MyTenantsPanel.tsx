import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, MessageSquare, Building2, CreditCard } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props { userId: string; }

const MyTenantsPanel = ({ userId }: Props) => {
  const [search, setSearch] = useState("");

  const { data: tenancies, isLoading } = useQuery({
    queryKey: ["my-tenants", userId],
    queryFn: async () => {
      const { data: ten } = await supabase
        .from("tenancy_records")
        .select("*")
        .eq("landlord_id", userId)
        .eq("tenancy_status", "active")
        .order("created_at", { ascending: false });
      if (!ten?.length) return [];

      const tenantIds = [...new Set(ten.map((t) => t.tenant_id))];
      const propIds = [...new Set(ten.map((t) => t.property_id).filter(Boolean) as string[])];

      const [{ data: profiles }, { data: props }, { data: txns }] = await Promise.all([
        supabase.from("profiles").select("user_id, name, email, phone, tenant_verification_status").in("user_id", tenantIds),
        propIds.length ? supabase.from("properties").select("id, title, location").in("id", propIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("rent_transactions").select("tenant_id, amount, verification_status, payment_date").in("tenant_id", tenantIds).order("created_at", { ascending: false }),
      ]);

      const pMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      const propMap = new Map((props ?? []).map((p) => [p.id, p]));
      const txnsByTenant = (txns ?? []).reduce<Record<string, any[]>>((acc, t) => {
        (acc[t.tenant_id] ||= []).push(t);
        return acc;
      }, {});

      return ten.map((t) => ({
        ...t,
        tenant: pMap.get(t.tenant_id),
        property: propMap.get(t.property_id ?? ""),
        recent_payments: (txnsByTenant[t.tenant_id] ?? []).slice(0, 5),
      }));
    },
  });

  const filtered = (tenancies ?? []).filter((t: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.tenant?.name?.toLowerCase().includes(q) ||
      t.tenant?.email?.toLowerCase().includes(q) ||
      t.tenant?.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent">
            <Users className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">My Tenants</h2>
            <p className="text-sm text-muted-foreground">{tenancies?.length ?? 0} active tenants</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, or phone" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
          <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{search ? "No tenants match your search." : "No active tenants yet."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{t.tenant?.name || "Unknown"}</p>
                    {t.tenant?.tenant_verification_status === "admin_verified" && (
                      <Badge variant="default" className="text-[10px]">Admin Verified</Badge>
                    )}
                    {t.tenant?.tenant_verification_status === "landlord_verified" && (
                      <Badge variant="secondary" className="text-[10px]">Verified</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.tenant?.email} · {t.tenant?.phone}</p>
                  {t.property && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {t.property.title} — {t.property.location}
                    </p>
                  )}
                  <p className="text-sm font-medium text-foreground mt-2">KES {t.monthly_rent?.toLocaleString()}/mo</p>
                </div>
              </div>

              {t.recent_payments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Recent payments
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {t.recent_payments.map((p: any, idx: number) => (
                      <Badge key={idx} variant={p.verification_status === "confirmed" ? "default" : "secondary"} className="text-[10px]">
                        KES {p.amount?.toLocaleString()} · {p.verification_status}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTenantsPanel;
