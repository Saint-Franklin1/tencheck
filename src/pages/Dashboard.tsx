import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Shield, Search, Home, Upload, BarChart3, MessageSquare,
  LogOut, Menu, X, FileText, Plus, Building2,
  ChevronRight, ChevronDown, Eye, Bed, Bath, MapPin, ImageIcon, Edit, Trash2,
  UserCheck, AlertTriangle, User, CreditCard, Wifi, Award, TrendingDown, Sparkles,
  Scale, Bell, ClipboardList, Link2
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ImageUpload from "@/components/dashboard/ImageUpload";
import { TenantProfileCard, ScoreGauge, ConfidenceBadge, PaymentTimeline, DisputeForm } from "@/components/dashboard/TenantProfile";
import { TenantPaymentPanel, LandlordPaymentOverview, WalletDeposit } from "@/components/dashboard/RentPaymentPanel";
import { ServiceRequestPanel } from "@/components/dashboard/ServiceRequestPanel";
import CreditPassportCard from "@/components/dashboard/CreditPassportCard";
import FinancialRequestPanel from "@/components/dashboard/FinancialRequestPanel";
import { TenantRiskPanel } from "@/components/dashboard/TenantRiskPanel";
import { PropertyDemandPanel } from "@/components/dashboard/PropertyDemandPanel";
import { TrustNetworkPanel } from "@/components/dashboard/TrustNetworkPanel";
import { DisputeOverviewPanel } from "@/components/dashboard/DisputeOverviewPanel";
import SharePassport from "@/components/dashboard/SharePassport";
import AIMatchPanel from "@/components/dashboard/AIMatchPanel";
import { MessagingHub } from "@/components/dashboard/MessagingHub";
import { NotificationsPanel, NotificationBell } from "@/components/dashboard/NotificationsPanel";
import { LandlordTenancyManager, TenantTenancyView } from "@/components/dashboard/TenancyManager";
import { ServiceCreditsPanel } from "@/components/dashboard/ServiceCreditsPanel";
import { FileWorkerComplaint } from "@/components/dashboard/WorkerComplaintsPanel";
import ApplicationLinkGenerator from "@/components/dashboard/ApplicationLinkGenerator";
import ApplicationsPanel from "@/components/dashboard/ApplicationsPanel";
import MyTenantsPanel from "@/components/dashboard/MyTenantsPanel";
import ReportsPanel from "@/components/dashboard/ReportsPanel";
import ConfirmPaymentsPanel from "@/components/dashboard/ConfirmPaymentsPanel";

type Tab = string;

const Dashboard = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("");

  const role = profile?.role || "tenant";

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && user && role === "service_worker") navigate("/worker-dashboard");
  }, [loading, user, navigate, role]);

  const queryClient = useQueryClient();

  useEffect(() => {
    if (role === "landlord") setActiveTab("my-properties");
    else if (role === "tenant") setActiveTab("browse-houses");
    else setActiveTab("search-tenant");
  }, [role]);

  // Realtime: listen for service_request changes and notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, () => {
        queryClient.invalidateQueries({ queryKey: ["service-requests"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["notif-count"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const landlordGroups = [
    {
      label: "Overview",
      tabs: [
        { id: "my-properties", icon: Building2, label: "Properties" },
        { id: "my-tenants", icon: UserCheck, label: "My Tenants" },
        { id: "reports", icon: BarChart3, label: "Reports" },
      ],
    },
    {
      label: "Applications",
      tabs: [
        { id: "applications", icon: ClipboardList, label: "Applications" },
        { id: "application-links", icon: Link2, label: "Share Links" },
      ],
    },
    {
      label: "Payments",
      tabs: [
        { id: "confirm-payments", icon: CheckCircle, label: "Confirm Payments" } as any,
        { id: "payment-overview", icon: CreditCard, label: "Payment History" },
      ],
    },
    {
      label: "Communication",
      tabs: [
        { id: "messages", icon: MessageSquare, label: "Messages" },
        { id: "notifications", icon: Bell, label: "Notifications" },
      ],
    },
    {
      label: "Moderation",
      tabs: [
        { id: "dispute-overview", icon: Scale, label: "Disputes" },
      ],
    },
  ];

  const tenantGroups = [
    {
      label: "Housing",
      tabs: [
        { id: "browse-houses", icon: Home, label: "Browse Houses" },
        { id: "tenancies", icon: ClipboardList, label: "My Tenancies" },
      ],
    },
    {
      label: "Reputation",
      tabs: [
        { id: "credit-passport", icon: Award, label: "Credit Passport" },
      ],
    },
    {
      label: "Payments",
      tabs: [
        { id: "rent-payment", icon: CreditCard, label: "Pay Rent" },
      ],
    },
    {
      label: "Services",
      tabs: [
        { id: "services", icon: Wifi, label: "Request Service" },
        { id: "my-disputes", icon: AlertTriangle, label: "My Disputes" },
      ],
    },
    {
      label: "Communication",
      tabs: [
        { id: "messages", icon: MessageSquare, label: "Messages" },
        { id: "notifications", icon: Bell, label: "Notifications" },
      ],
    },
    {
      label: "Account",
      tabs: [
        { id: "my-profile", icon: User, label: "My Profile" },
      ],
    },
  ];

  const groups = role === "landlord" ? landlordGroups : tenantGroups;
  const allTabs = groups.flatMap((g) => g.tabs);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-card border-r border-border flex flex-col transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-border shrink-0">
          <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold text-foreground">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            TenCheck
          </Link>
          <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Profile */}
        <div className="px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center shrink-0">
              <span className="font-display font-bold text-sm text-accent-foreground">
                {(profile?.name || "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">{profile?.name || "User"}</p>
              <Badge variant="secondary" className="text-[10px] font-medium capitalize mt-0.5">
                {role}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {groups.map((group) => (
            <Collapsible key={group.label} defaultOpen>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground group">
                {group.label}
                <ChevronDown className="h-3 w-3 transition-transform group-data-[state=closed]:-rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-0.5 mt-0.5">
                {group.tabs.map((tab) => (
                  <SidebarItem
                    key={tab.id}
                    icon={tab.icon}
                    label={tab.label}
                    active={activeTab === tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSidebarOpen(false);
                    }}
                  />
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-border shrink-0">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display font-bold text-lg text-foreground">
              {allTabs.find((t) => t.id === activeTab)?.label || "Dashboard"}
            </h1>
          </div>
          <NotificationBell userId={user.id} onClick={() => setActiveTab("notifications")} />
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {/* Shared tabs */}
                {activeTab === "messages" && <MessagingHub userId={user.id} userRole={role} />}
                {activeTab === "notifications" && <NotificationsPanel userId={user.id} />}

                {/* Landlord tabs */}
                {role === "landlord" && activeTab === "search-tenant" && <SearchTenantView />}
                {role === "landlord" && activeTab === "report-payment" && <ReportPaymentView userId={user.id} />}
                {role === "landlord" && activeTab === "my-properties" && <MyPropertiesView userId={user.id} />}
                {role === "landlord" && activeTab === "payment-overview" && <LandlordPaymentOverview userId={user.id} />}
                {role === "landlord" && activeTab === "inquiries" && <LandlordInquiriesView userId={user.id} />}
                {role === "landlord" && activeTab === "dispute-overview" && <DisputeOverviewPanel userId={user.id} role="landlord" />}
                {role === "landlord" && activeTab === "tenancy-records" && <LandlordTenancyManager userId={user.id} />}
                {role === "landlord" && activeTab === "application-links" && <ApplicationLinkGenerator userId={user.id} />}
                {role === "landlord" && activeTab === "applications" && <ApplicationsPanel userId={user.id} />}

                {/* Tenant tabs */}
                {role === "tenant" && activeTab === "browse-houses" && <BrowseHousesView />}
                {role === "tenant" && activeTab === "credit-passport" && <CreditPassportCard userId={user.id} />}
                {role === "tenant" && activeTab === "rent-payment" && <TenantPaymentPanel userId={user.id} />}
                {role === "tenant" && activeTab === "services" && <ServiceRequestPanel userId={user.id} />}
                {role === "tenant" && activeTab === "my-disputes" && <MyDisputesView userId={user.id} />}
                {role === "tenant" && activeTab === "tenancies" && <TenantTenancyView userId={user.id} />}
                {role === "tenant" && activeTab === "my-profile" && (
                  <div className="text-center py-8">
                    <Button asChild><Link to="/my-profile">Open Full Profile</Link></Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any; label: string; active?: boolean; onClick?: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? "bg-primary/10 text-primary shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`}
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{label}</span>
    {active && <ChevronRight className="h-3.5 w-3.5 ml-auto shrink-0 opacity-60" />}
  </button>
);

// ScoreGauge imported from TenantProfile component

// ===== Landlord Views =====

const SearchTenantView = () => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("*")
      .or(`national_id.eq.${query},phone.eq.${query}`)
      .maybeSingle();

    if (tenant) {
      const tenantUserId = tenant.user_id || tenant.id;
      const { data: score } = await supabase
        .from("tenant_scores")
        .select("*")
        .eq("tenant_id", tenantUserId)
        .maybeSingle();
      setResult({ tenant, score });
    } else {
      setResult(null);
      toast.info("No tenant found with that ID or phone number.");
    }
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <Search className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Search Tenant</h2>
            <p className="text-sm text-muted-foreground">Look up a tenant by National ID or phone</p>
          </div>
        </div>
        <div className="flex gap-3 max-w-md">
          <Input
            placeholder="National ID or phone number"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button className="gap-2 shrink-0" onClick={handleSearch} disabled={searching}>
            <Search className="h-4 w-4" /> {searching ? "..." : "Search"}
          </Button>
        </div>
      </div>

      {result && (
        <TenantProfileCard tenant={result.tenant} score={result.score} />
      )}
    </div>
  );
};

const ReportPaymentView = ({ userId }: { userId: string }) => {
  const [tenantPhone, setTenantPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("paid");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { data: tenant } = await supabase
      .from("tenants")
      .select("user_id")
      .eq("phone", tenantPhone)
      .maybeSingle();

    if (!tenant) {
      toast.error("Tenant not found with that phone number");
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("rental_records").insert({
      tenant_id: tenant.user_id!,
      landlord_id: userId,
      rent_amount: parseInt(amount),
      payment_status: status,
      payment_date: new Date().toISOString().split("T")[0],
    });

    setSubmitting(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Payment reported successfully");
      setTenantPhone("");
      setAmount("");
    }
  };

  return (
    <div className="max-w-lg">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <FileText className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Report Payment</h2>
            <p className="text-sm text-muted-foreground">Record a tenant's rent payment status</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tenant Phone</Label>
            <Input placeholder="0712 345 678" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Amount (Ksh)</Label>
            <Input type="number" placeholder="12000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="paid">Paid On Time</option>
              <option value="late">Late</option>
              <option value="missed">Missed</option>
            </select>
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Reporting..." : "Report Payment"}
          </Button>
        </form>
      </div>
    </div>
  );
};

const MyPropertiesView = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [rent, setRent] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [images, setImages] = useState<string[]>([]);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["my-properties", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const createProperty = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("properties").insert({
        landlord_id: userId,
        title,
        description,
        location,
        rent_amount: parseInt(rent),
        bedrooms: parseInt(bedrooms),
        bathrooms: parseInt(bathrooms),
        images,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Property listed!");
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
      setShowForm(false);
      resetForm();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setRent("");
    setBedrooms("1");
    setBathrooms("1");
    setImages([]);
  };

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Property removed");
      queryClient.invalidateQueries({ queryKey: ["my-properties"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">My Properties</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {properties?.length ?? 0} {(properties?.length ?? 0) === 1 ? "property" : "properties"} listed
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Cancel" : "Add Property"}
        </Button>
      </div>

      {/* Add Property Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display font-bold text-lg mb-5 text-foreground">New Property Listing</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createProperty.mutate();
                }}
                className="space-y-5"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Modern 2BR Apartment" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kilimani, Nairobi" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the property, amenities, nearby facilities..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Rent (Ksh)</Label>
                    <Input type="number" value={rent} onChange={(e) => setRent(e.target.value)} placeholder="25,000" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input type="number" min="0" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
                  </div>
                </div>

                {/* Image Upload */}
                <ImageUpload images={images} onImagesChange={setImages} maxImages={10} />

                <div className="flex gap-3 pt-2">
                  <Button type="submit" disabled={createProperty.isPending} className="gap-2">
                    {createProperty.isPending ? "Listing..." : "List Property"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Properties Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : properties?.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-display font-semibold text-foreground">No properties yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">List your first property to start receiving inquiries</p>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties?.map((p) => (
            <PropertyCard key={p.id} property={p} onDelete={(id) => deleteProperty.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
};

const PropertyCard = ({ property: p, onDelete }: { property: any; onDelete: (id: string) => void }) => {
  const coverImage = p.images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-muted overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
            <ImageIcon className="h-10 w-10" />
            <span className="text-xs">No photos</span>
          </div>
        )}
        {p.images?.length > 1 && (
          <span className="absolute bottom-2 right-2 text-xs font-medium px-2 py-1 rounded-md bg-foreground/70 text-background backdrop-blur-sm">
            {p.images.length} photos
          </span>
        )}
        <Badge
          className={`absolute top-3 left-3 ${
            p.is_available
              ? "bg-primary/90 text-primary-foreground hover:bg-primary"
              : "bg-destructive/90 text-destructive-foreground hover:bg-destructive"
          }`}
        >
          {p.is_available ? "Available" : "Taken"}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-foreground truncate">{p.title}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{p.location}</span>
            </p>
          </div>
          <button
            onClick={() => onDelete(p.id)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <p className="font-display font-bold text-lg text-foreground">
            Ksh {p.rent_amount.toLocaleString()}
            <span className="text-xs font-normal text-muted-foreground">/mo</span>
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" /> {p.bedrooms}</span>
            <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" /> {p.bathrooms}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const LandlordInquiriesView = ({ userId }: { userId: string }) => {
  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["landlord-inquiries", userId],
    queryFn: async () => {
      const { data: myProps } = await supabase
        .from("properties")
        .select("id, title")
        .eq("landlord_id", userId);
      if (!myProps?.length) return [];

      const propIds = myProps.map((p) => p.id);
      const { data } = await supabase
        .from("inquiries")
        .select("*, properties(title)")
        .in("property_id", propIds)
        .order("created_at", { ascending: false });

      if (!data?.length) return [];

      // Fetch tenant scores for each inquiry
      const tenantIds = [...new Set(data.map((inq) => inq.tenant_id))];
      const { data: scores } = await supabase
        .from("tenant_scores")
        .select("tenant_id, score, confidence_level")
        .in("tenant_id", tenantIds);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", tenantIds);

      const scoreMap = Object.fromEntries((scores ?? []).map((s) => [s.tenant_id, s]));
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      return data.map((inq) => ({
        ...inq,
        tenant_score: scoreMap[inq.tenant_id],
        tenant_profile: profileMap[inq.tenant_id],
      }));
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 rounded-xl bg-accent">
          <MessageSquare className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg text-foreground">Inquiries</h2>
          <p className="text-sm text-muted-foreground">{inquiries?.length ?? 0} messages from tenants</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : inquiries?.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No inquiries yet</p>
        </div>
      ) : (
        inquiries?.map((inq: any) => (
          <div key={inq.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{inq.properties?.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  From: {inq.tenant_profile?.name || "Unknown tenant"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{inq.message}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <Badge variant={inq.status === "pending" ? "default" : "secondary"}>
                  {inq.status}
                </Badge>
                {inq.tenant_score && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className={`font-bold ${
                      inq.tenant_score.score >= 80 ? "text-primary" :
                      inq.tenant_score.score >= 60 ? "text-yellow-600" : "text-destructive"
                    }`}>
                      Score: {inq.tenant_score.score}
                    </span>
                    <span className="text-muted-foreground capitalize">
                      ({inq.tenant_score.confidence_level})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ===== Tenant Views =====

const BrowseHousesView = () => {
  const { data: properties, isLoading } = useQuery({
    queryKey: ["all-properties"],
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("is_available", true).order("created_at", { ascending: false }).limit(12);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display font-bold text-xl text-foreground">Available Properties</h2>
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <Link to="/properties"><Eye className="h-3.5 w-3.5" /> View All</Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-64 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : properties?.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <Home className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No properties available right now</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {properties?.map((p) => (
            <Link key={p.id} to={`/properties/${p.id}`} className="group rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-[16/10] bg-muted overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                    <ImageIcon className="h-10 w-10" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-display font-bold text-foreground">{p.title}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" /> {p.location}
                </p>
                <p className="font-display font-bold text-lg mt-2 text-foreground">
                  Ksh {p.rent_amount.toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                </p>
                <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><Bed className="h-3 w-3" /> {p.bedrooms} BR</span>
                  <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> {p.bathrooms} BA</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const UploadProofView = () => {
  const [smsText, setSmsText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleUpload = async () => {
    if (!smsText.trim()) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("parse-sms", {
      body: { sms_text: smsText },
    });

    setSubmitting(false);
    if (error) {
      toast.error("Failed to parse SMS");
    } else {
      if (data.reconciled) {
        toast.success(`Payment auto-matched to landlord: ${data.matched_landlord}!`);
      } else {
        toast.success("Payment evidence submitted!");
      }
      setResult({ ...data.parsed, reconciled: data.reconciled, matched_landlord: data.matched_landlord });
      setSmsText("");
    }
  };

  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <Upload className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Upload M-Pesa Proof</h2>
            <p className="text-sm text-muted-foreground">Paste your confirmation SMS to verify payment</p>
          </div>
        </div>
        <Textarea
          placeholder='Confirmed. Ksh 12000 sent to John Kamau. Transaction ID QJK123ABC Date 7/3/2026'
          value={smsText}
          onChange={(e) => setSmsText(e.target.value)}
          rows={5}
          className="mb-4"
        />
        <Button onClick={handleUpload} disabled={submitting} className="gap-2">
          <Upload className="h-4 w-4" />
          {submitting ? "Parsing..." : "Submit Payment Proof"}
        </Button>
      </div>

      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <h3 className="font-display font-bold mb-3 text-foreground">Parsed Results</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">Amount</p>
              <p className="font-bold text-foreground">Ksh {result.amount?.toLocaleString() ?? "N/A"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">Transaction Code</p>
              <p className="font-bold text-foreground">{result.transaction_code ?? "N/A"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">Receiver</p>
              <p className="font-bold text-foreground">{result.receiver_name ?? "N/A"}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-muted-foreground text-xs">Date</p>
              <p className="font-bold text-foreground">{result.payment_date ?? "N/A"}</p>
            </div>
          </div>
          {result.reconciled && (
            <div className="mt-3 rounded-lg bg-primary/10 border border-primary/20 p-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-primary font-medium">
                ✅ Auto-reconciled with landlord: {result.matched_landlord}
              </p>
            </div>
          )}
          {result.reconciled === false && (
            <div className="mt-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3">
              <p className="text-sm text-yellow-600">
                Could not auto-match to a landlord. Evidence saved for manual review.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

const MyScoreView = ({ userId }: { userId: string }) => {
  const { data: score, isLoading } = useQuery({
    queryKey: ["my-score", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_scores")
        .select("*")
        .eq("tenant_id", userId)
        .maybeSingle();
      return data;
    },
  });

  const { data: evidence } = useQuery({
    queryKey: ["my-evidence", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payment_evidence")
        .select("*")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display font-bold text-xl mb-2 text-foreground">Your Reputation Score</h2>
        <div className="mb-4">
          <ConfidenceBadge level={(score as any)?.confidence_level || "low"} />
          <span className="text-xs text-muted-foreground ml-2">
            {(score as any)?.data_sources_count ?? 0} landlord(s) reporting
          </span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <ScoreGauge score={score?.score ?? 100} />
          <div className="grid grid-cols-2 gap-3 flex-1 w-full">
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-2xl font-display font-bold text-foreground">{score?.total_payments ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Payments</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-2xl font-display font-bold text-foreground">{score?.verified_sms_payments ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Verified SMS</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-2xl font-display font-bold text-yellow-600">{score?.late_payments ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Late</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4 text-center">
              <p className="text-2xl font-display font-bold text-destructive">{score?.missed_payments ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Missed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Timeline */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display font-bold mb-4 text-foreground">Payment Timeline</h3>
        <PaymentTimeline tenantId={userId} />
      </div>

      {evidence && evidence.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display font-bold mb-4 text-foreground">Payment Evidence History</h3>
          <div className="space-y-2">
            {evidence.map((e) => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50">
                <div>
                  <p className="text-sm font-medium text-foreground">Ksh {e.amount?.toLocaleString() ?? "—"} → {e.receiver_name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{e.transaction_code} • {e.payment_date ?? "—"}</p>
                </div>
                <Badge variant={e.verification_status === "verified" ? "default" : "secondary"}>
                  {e.verification_status}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const MyDisputesView = ({ userId }: { userId: string }) => {
  const { data: records } = useQuery({
    queryKey: ["my-records-for-disputes", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("rental_records")
        .select("*")
        .eq("tenant_id", userId)
        .order("payment_date", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <DisputeForm tenantId={userId} rentalRecords={records || []} />
      </div>
    </div>
  );
};

const TenantInquiriesView = ({ userId }: { userId: string }) => {
  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["tenant-inquiries", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("inquiries")
        .select("*, properties(title, location)")
        .eq("tenant_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold text-xl text-foreground">My Inquiries</h2>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : inquiries?.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No inquiries yet</p>
        </div>
      ) : (
        inquiries?.map((inq: any) => (
          <div key={inq.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{inq.properties?.title} — {inq.properties?.location}</p>
                <p className="text-sm text-muted-foreground mt-1">{inq.message}</p>
              </div>
              <Badge variant={inq.status === "pending" ? "default" : "secondary"} className="shrink-0">
                {inq.status}
              </Badge>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const SERVICE_CATEGORIES = [
  "WiFi Installation",
  "Relocation Assistance", "Furniture Moving", "House Cleaning", "Deep Cleaning",
  "Landscaping", "Lawn Mowing", "Hedge Trimming", "Tree Pruning",
  "Waste Removal", "Interior Painting", "Exterior Painting", "Carpentry",
  "Cabinet Installation", "Masonry", "Plumbing", "Electrical Repair",
  "Appliance Installation", "Curtain Installation", "Furniture Assembly",
  "Pest Control", "Roof Repair", "Window Repair", "Tile Installation",
  "Water Tank Cleaning", "Drain Unclogging", "General Handyman",
];

const EndorseWorkerView = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("General Handyman");
  const [experience, setExperience] = useState("1");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: endorsedWorkers, isLoading } = useQuery({
    queryKey: ["endorsed-workers", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("worker_endorsements")
        .select("*, service_workers(*)")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const handleEndorse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Create worker profile
    const { data: worker, error: workerErr } = await supabase
      .from("service_workers")
      .insert({
        name,
        phone,
        location,
        service_category: category,
        experience_years: parseInt(experience),
        landlord_endorser_id: userId,
        verification_status: "verified",
      })
      .select()
      .single();

    if (workerErr || !worker) {
      toast.error(workerErr?.message || "Failed to create worker");
      setSubmitting(false);
      return;
    }

    // Create endorsement
    const { error: endorseErr } = await supabase
      .from("worker_endorsements")
      .insert({
        worker_id: worker.id,
        landlord_id: userId,
        endorsement_notes: notes,
      });

    setSubmitting(false);
    if (endorseErr) {
      toast.error(endorseErr.message);
    } else {
      toast.success("Worker endorsed successfully!");
      queryClient.invalidateQueries({ queryKey: ["endorsed-workers"] });
      setName("");
      setPhone("");
      setLocation("");
      setExperience("1");
      setNotes("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Endorse Form */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <UserCheck className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Endorse a Service Worker</h2>
            <p className="text-sm text-muted-foreground">Recommend a trusted worker to the TenCheck community</p>
          </div>
        </div>
        <form onSubmit={handleEndorse} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Worker Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Kamau" required />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Service Category</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {SERVICE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Years of Experience</Label>
              <Input type="number" min="0" value={experience} onChange={(e) => setExperience(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Kilimani, Nairobi" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Endorsement Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why do you recommend this worker? Quality of work, reliability, etc."
              rows={3}
            />
          </div>
          <Button type="submit" disabled={submitting} className="gap-2">
            <UserCheck className="h-4 w-4" />
            {submitting ? "Endorsing..." : "Endorse Worker"}
          </Button>
        </form>
      </div>

      {/* Endorsed workers list */}
      <div>
        <h3 className="font-display font-bold text-lg text-foreground mb-4">Your Endorsed Workers</h3>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : endorsedWorkers?.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center">
            <UserCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">You haven't endorsed any workers yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {endorsedWorkers?.map((e: any) => (
              <div key={e.id} className="rounded-xl border border-border bg-card p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-foreground">{e.service_workers?.name}</p>
                    <p className="text-xs text-muted-foreground">{e.service_workers?.service_category} • {e.service_workers?.location}</p>
                    {e.endorsement_notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic">"{e.endorsement_notes}"</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    <Shield className="h-3 w-3 mr-1" /> Endorsed
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const LandlordTenantRiskView = () => {
  const [tenantPhone, setTenantPhone] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!tenantPhone.trim()) return;
    setSearching(true);
    const { data: tenant } = await supabase
      .from("tenants")
      .select("user_id")
      .eq("phone", tenantPhone)
      .maybeSingle();
    if (tenant?.user_id) {
      setTenantId(tenant.user_id);
    } else {
      toast.info("No tenant found with that phone number.");
      setTenantId(null);
    }
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-accent">
            <TrendingDown className="h-5 w-5 text-accent-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Tenant Risk Lookup</h2>
            <p className="text-sm text-muted-foreground">Search a tenant to view their risk assessment</p>
          </div>
        </div>
        <div className="flex gap-3 max-w-md">
          <Input placeholder="Tenant phone number" value={tenantPhone} onChange={(e) => setTenantPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} />
          <Button className="gap-2 shrink-0" onClick={handleSearch} disabled={searching}>
            <Search className="h-4 w-4" /> {searching ? "..." : "Search"}
          </Button>
        </div>
      </div>
      {tenantId && <TenantRiskPanel tenantId={tenantId} />}
    </div>
  );
};

const LandlordAIRankView = ({ userId }: { userId: string }) => {
  const { data: properties, isLoading } = useQuery({
    queryKey: ["my-properties-for-ai", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, title, location")
        .eq("landlord_id", userId);
      return data ?? [];
    },
  });

  const [selectedProperty, setSelectedProperty] = useState<string>("");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">AI Tenant Ranking</h2>
            <p className="text-sm text-muted-foreground">Select a property to rank applicants</p>
          </div>
        </div>
        {isLoading ? (
          <div className="h-10 rounded-lg bg-muted animate-pulse" />
        ) : properties?.length === 0 ? (
          <p className="text-sm text-muted-foreground">List a property first to use AI ranking.</p>
        ) : (
          <select
            className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            <option value="">Select a property...</option>
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>{p.title} — {p.location}</option>
            ))}
          </select>
        )}
      </div>
      {selectedProperty && (
        <AIMatchPanel userId={userId} mode="landlord" propertyId={selectedProperty} />
      )}
    </div>
  );
};

export default Dashboard;
