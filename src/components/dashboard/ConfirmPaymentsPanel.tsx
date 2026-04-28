import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, Clock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { userId: string; }

const ConfirmPaymentsPanel = ({ userId }: Props) => {
  const qc = useQueryClient();

  const { data: txns, isLoading } = useQuery({
    queryKey: ["pending-payments", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rent_transactions")
        .select("*")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (!data?.length) return [];
      const ids = [...new Set(data.map((t) => t.tenant_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, name, phone").in("user_id", ids);
      const pmap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
      return data.map((t) => ({ ...t, tenant: pmap.get(t.tenant_id) }));
    },
  });

  const confirm = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("confirm_tenancy_payment", { _txn_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment confirmed");
      qc.invalidateQueries({ queryKey: ["pending-payments"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const pending = (txns ?? []).filter((t: any) => t.verification_status === "pending");
  const confirmed = (txns ?? []).filter((t: any) => t.verification_status === "confirmed");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent">
          <CreditCard className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Confirm Payments</h2>
          <p className="text-sm text-muted-foreground">{pending.length} awaiting confirmation</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : pending.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
          <CheckCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No payments awaiting confirmation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">KES {t.amount?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t.tenant?.name || "Unknown"} · {t.payment_method}{t.mpesa_transaction_code ? ` · ${t.mpesa_transaction_code}` : ""}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <Button size="sm" className="gap-1" onClick={() => confirm.mutate(t.id)} disabled={confirm.isPending}>
                <CheckCircle className="h-3.5 w-3.5" /> Confirm
              </Button>
            </div>
          ))}
        </div>
      )}

      {confirmed.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent confirmed</p>
          <div className="space-y-2">
            {confirmed.slice(0, 10).map((t: any) => (
              <div key={t.id} className="rounded-lg border border-border/50 bg-card/50 p-3 flex items-center justify-between text-sm">
                <span>KES {t.amount?.toLocaleString()} · {t.tenant?.name}</span>
                <Badge variant="default" className="text-[10px] gap-1"><CheckCircle className="h-3 w-3" /> confirmed</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfirmPaymentsPanel;
