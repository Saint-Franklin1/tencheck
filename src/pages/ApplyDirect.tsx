import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Bed, Bath, ArrowLeft, CheckCircle, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ApplyDirect = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; thread_id?: string; tenancy_id?: string } | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase.from("properties").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setProperty(data);
      setLoadingData(false);
    });
  }, [id]);

  useEffect(() => {
    if (!loading && !user) {
      navigate(`/login?redirect=/properties/${id}/apply`);
    }
  }, [loading, user, navigate, id]);

  const handleApply = async () => {
    if (!user || !property) return;
    if (profile?.role !== "tenant") {
      toast.error("Only tenants can apply for properties.");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.rpc("auto_apply_property", {
      _property_id: property.id,
      _message: message.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const r = data as any;
    if (r?.duplicate) {
      toast.info("You've already applied for this property.");
    } else if (r?.status === "auto_approved") {
      toast.success("Application auto-approved! You're now an active tenant.");
    } else {
      toast.success("Application submitted!");
    }
    setResult(r);
  };

  if (loadingData || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="font-display text-xl font-bold mb-2">Property Not Found</h1>
          <Button asChild><Link to="/properties">Browse Properties</Link></Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link to={`/properties/${property.id}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to listing
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
          {property.images?.[0] && (
            <div className="aspect-[16/8] overflow-hidden">
              <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">{property.title}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3.5 w-3.5" /> {property.location}
                </p>
              </div>
              <Badge variant={property.is_available ? "default" : "destructive"}>
                {property.is_available ? "Available" : "Full"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <p className="font-display text-2xl font-bold text-foreground">
                Ksh {property.rent_amount?.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <div className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Bed className="h-4 w-4" /> {property.bedrooms} BR</span>
                <span className="flex items-center gap-1"><Bath className="h-4 w-4" /> {property.bathrooms} BA</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {property.occupied_units}/{property.total_units} units occupied
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl border border-border bg-card p-6">
          {result ? (
            <div className="text-center py-6">
              {result.status === "auto_approved" ? (
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
              ) : (
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              )}
              <h2 className="font-display text-xl font-bold text-foreground mb-2">
                {result.status === "auto_approved" ? "You're In!" : "Application Sent"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {result.status === "auto_approved"
                  ? "The unit was vacant — you've been auto-approved as a tenant. A chat with the landlord is open."
                  : "The landlord will review and respond. You can message them directly anytime."}
              </p>
              <div className="flex gap-3 justify-center">
                <Button asChild variant="outline"><Link to="/dashboard">Dashboard</Link></Button>
                <Button asChild><Link to="/dashboard">Open Messages</Link></Button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Apply for This Property</h2>
              <p className="text-sm text-muted-foreground mb-5">Your TenCheck trust profile will be shared with the landlord.</p>

              <div className="rounded-xl bg-muted/50 border border-border/50 p-4 mb-5">
                <p className="text-sm font-medium text-foreground">{profile?.name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email} · {profile?.phone || "no phone"}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Message to landlord (optional)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself, mention move-in date, etc."
                    rows={4}
                  />
                </div>
                <Button onClick={handleApply} disabled={submitting} className="w-full gap-2">
                  <Shield className="h-4 w-4" />
                  {submitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ApplyDirect;
