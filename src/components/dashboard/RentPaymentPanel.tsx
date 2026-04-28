import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard, Wallet, Building2, CheckCircle, Clock,
  AlertTriangle, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tenant Rent Payment Panel — driven by tenancy selection
export const TenantPaymentPanel = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [payMethod, setPayMethod] = useState<"mpesa" | "bank_transfer">("mpesa");
  const [amount, setAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [tenancyId, setTenancyId] = useState<string>("");

  const { data: wallet } = useQuery({
    queryKey: ["wallet", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_wallets")
        .select("*")
        .eq("tenant_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: tenancies } = useQuery({
    queryKey: ["my-tenancies-for-pay", userId],
    queryFn: async () => {
      const { data: t } = await supabase
        .from("tenancy_records")
        .select("id, monthly_rent, property_id, landlord_id")
        .eq("tenant_id", userId)
        .eq("tenancy_status", "active");
      if (!t?.length) return [];
      const propIds = t.map((x) => x.property_id).filter(Boolean) as string[];
      const llIds = [...new Set(t.map((x) => x.landlord_id))];
      const [{ data: props }, { data: lls }] = await Promise.all([
        propIds.length ? supabase.from("properties").select("id, title").in("id", propIds) : Promise.resolve({ data: [] as any[] }),
        supabase.from("profiles").select("user_id, name").in("user_id", llIds),
      ]);
      const pmap = new Map((props ?? []).map((p) => [p.id, p]));
      const lmap = new Map((lls ?? []).map((l) => [l.user_id, l]));
      return t.map((x) => ({ ...x, property: pmap.get(x.property_id ?? ""), landlord: lmap.get(x.landlord_id) }));
    },
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["rent-transactions", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rent_transactions")
        .select("*")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!tenancyId) throw new Error("Select a tenancy");
      if (!amount || parseInt(amount) <= 0) throw new Error("Enter a valid amount");
      const { data, error } = await supabase.rpc("record_tenancy_payment", {
        _tenancy_id: tenancyId,
        _amount: parseInt(amount),
        _method: payMethod,
        _code: mpesaCode || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Payment reported — landlord will confirm.");
      queryClient.invalidateQueries({ queryKey: ["rent-transactions"] });
      setAmount("");
      setMpesaCode("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const statusConfig: Record<string, { icon: any; color: string }> = {
    confirmed: { icon: CheckCircle, color: "text-primary" },
    pending: { icon: Clock, color: "text-yellow-600" },
    disputed: { icon: AlertTriangle, color: "text-destructive" },
  };

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-accent">
            <Wallet className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Wallet Balance</h2>
            <p className="text-sm text-muted-foreground">Available for instant rent payments</p>
          </div>
        </div>
        <p className="text-3xl font-display font-bold text-foreground">
          Ksh {(wallet?.balance ?? 0).toLocaleString()}
        </p>
      </div>

      {/* Pay Rent */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <CreditCard className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Record Rent Payment</h2>
            <p className="text-sm text-muted-foreground">Submit payment for landlord confirmation</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            recordPayment.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Tenancy</Label>
            <select
              className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
              value={tenancyId}
              onChange={(e) => setTenancyId(e.target.value)}
              required
            >
              <option value="">Select a tenancy…</option>
              {(tenancies ?? []).map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.property?.title || "Property"} — {t.landlord?.name || "Landlord"} (KES {t.monthly_rent?.toLocaleString()})
                </option>
              ))}
            </select>
            {(tenancies ?? []).length === 0 && (
              <p className="text-xs text-muted-foreground">No active tenancies. Apply to a property first.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Amount (Ksh)</Label>
            <Input
              type="number"
              placeholder="12000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              {(["mpesa", "bank_transfer"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMethod(m)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                    payMethod === m
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {m === "mpesa" ? "M-Pesa" : "Bank"}
                </button>
              ))}
            </div>
          </div>
          {payMethod === "mpesa" && (
            <div className="space-y-2">
              <Label>M-Pesa Transaction Code (optional)</Label>
              <Input
                placeholder="QJK123ABC"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value)}
              />
            </div>
          )}
          <Button type="submit" className="w-full" disabled={recordPayment.isPending}>
            {recordPayment.isPending ? "Submitting..." : "Submit Payment"}
          </Button>
        </form>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display font-bold text-lg text-foreground mb-4">Payment History</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : transactions?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions?.map((txn: any) => {
              const cfg = statusConfig[txn.verification_status] || statusConfig.pending;
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={txn.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <ArrowUpRight className="h-4 w-4 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Ksh {txn.amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {txn.payment_method?.toUpperCase()} • {txn.payment_date}
                        {txn.mpesa_transaction_code && ` • ${txn.mpesa_transaction_code}`}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] gap-1 ${
                      txn.verification_status === "confirmed"
                        ? "bg-primary/10 text-primary"
                        : txn.verification_status === "disputed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-yellow-500/10 text-yellow-600"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {txn.verification_status}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Landlord Payment Overview
export const LandlordPaymentOverview = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["landlord-transactions", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rent_transactions")
        .select("*")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!data?.length) return [];

      // Fetch tenant names
      const tenantIds = [...new Set(data.map((t) => t.tenant_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, phone")
        .in("user_id", tenantIds);
      const profileMap = Object.fromEntries(
        (profiles ?? []).map((p) => [p.user_id, p])
      );

      return data.map((t) => ({
        ...t,
        tenant_profile: profileMap[t.tenant_id],
      }));
    },
  });

  const confirmPayment = useMutation({
    mutationFn: async (txnId: string) => {
      const { data, error } = await supabase.functions.invoke("record-payment", {
        body: { action: "confirm", transaction_id: txnId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Payment confirmed!");
      queryClient.invalidateQueries({ queryKey: ["landlord-transactions"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filtered = transactions?.filter(
    (t: any) => statusFilter === "all" || t.verification_status === statusFilter
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <Building2 className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Payment Overview</h2>
            <p className="text-sm text-muted-foreground">Tenant rent payments received</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {["all", "pending", "confirmed", "disputed"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filtered?.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No transactions found</p>
        ) : (
          <div className="space-y-2">
            {filtered?.map((txn: any) => (
              <div
                key={txn.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <ArrowDownRight className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Ksh {txn.amount?.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {txn.tenant_profile?.name || "Unknown"} • {txn.payment_method?.toUpperCase()} • {txn.payment_date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${
                      txn.verification_status === "confirmed"
                        ? "bg-primary/10 text-primary"
                        : txn.verification_status === "disputed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-yellow-500/10 text-yellow-600"
                    }`}
                  >
                    {txn.verification_status}
                  </Badge>
                  {txn.verification_status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => confirmPayment.mutate(txn.id)}
                      disabled={confirmPayment.isPending}
                    >
                      Confirm
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Wallet Deposit component
export const WalletDeposit = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");

  const deposit = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("record-payment", {
        body: { action: "wallet-deposit", amount: parseInt(amount) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Deposit successful!");
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      setAmount("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="font-display font-bold text-lg text-foreground mb-4">Top Up Wallet</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          deposit.mutate();
        }}
        className="flex gap-3"
      >
        <Input
          type="number"
          placeholder="Amount (Ksh)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
        <Button type="submit" disabled={deposit.isPending} className="shrink-0">
          {deposit.isPending ? "..." : "Deposit"}
        </Button>
      </form>
    </div>
  );
};
