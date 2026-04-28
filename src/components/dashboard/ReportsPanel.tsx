import { BarChart3, ClipboardList, CheckCircle, XCircle, Home, CreditCard, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props { userId: string; }

const ReportsPanel = ({ userId }: Props) => {
  const { data, isLoading } = useQuery({
    queryKey: ["landlord-reports", userId],
    queryFn: async () => {
      const since = new Date(Date.now() - 90 * 86400000).toISOString();

      const [{ data: apps }, { data: props }, { data: txns }, { data: complaints }] = await Promise.all([
        supabase.from("property_applications").select("application_status").eq("landlord_id", userId),
        supabase.from("properties").select("total_units, occupied_units").eq("landlord_id", userId),
        supabase.from("rent_transactions").select("verification_status, payment_date").eq("landlord_id", userId).gte("created_at", since),
        supabase.from("disputes").select("id").eq("landlord_id", userId),
      ]);

      const total_apps = apps?.length ?? 0;
      const approved = apps?.filter((a) => a.application_status === "approved" || a.application_status === "auto_approved").length ?? 0;
      const rejected = apps?.filter((a) => a.application_status === "rejected").length ?? 0;
      const pending = apps?.filter((a) => a.application_status === "pending").length ?? 0;

      const totalUnits = props?.reduce((s, p) => s + (p.total_units ?? 0), 0) ?? 0;
      const occupiedUnits = props?.reduce((s, p) => s + (p.occupied_units ?? 0), 0) ?? 0;
      const occupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

      const totalTxns = txns?.length ?? 0;
      const confirmed = txns?.filter((t) => t.verification_status === "confirmed").length ?? 0;
      const consistency = totalTxns > 0 ? Math.round((confirmed / totalTxns) * 100) : 0;

      return {
        total_apps, approved, rejected, pending,
        occupancy, totalUnits, occupiedUnits,
        consistency, confirmed, totalTxns,
        complaints: complaints?.length ?? 0,
      };
    },
  });

  if (isLoading || !data) {
    return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>;
  }

  const stats = [
    { label: "Total Applications", value: data.total_apps, icon: ClipboardList, color: "text-foreground" },
    { label: "Approved", value: data.approved, icon: CheckCircle, color: "text-primary" },
    { label: "Rejected", value: data.rejected, icon: XCircle, color: "text-destructive" },
    { label: "Pending", value: data.pending, icon: ClipboardList, color: "text-yellow-600" },
    { label: "Occupancy Rate", value: `${data.occupancy}%`, sub: `${data.occupiedUnits}/${data.totalUnits} units`, icon: Home, color: "text-foreground" },
    { label: "Payment Consistency", value: `${data.consistency}%`, sub: `${data.confirmed}/${data.totalTxns} confirmed (90d)`, icon: CreditCard, color: "text-foreground" },
    { label: "Open Complaints", value: data.complaints, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-accent">
          <BarChart3 className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Reports</h2>
          <p className="text-sm text-muted-foreground">Performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className={`font-display text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
            {s.sub && <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReportsPanel;
