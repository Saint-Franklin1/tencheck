import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, MapPin, Bed, Bath, ArrowLeft, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ApplyProperty = () => {
  const { token } = useParams<{ token: string }>();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [linkData, setLinkData] = useState<any>(null);
  const [property, setProperty] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLink = async () => {
      if (!token) { setError("Invalid link"); setLoadingData(false); return; }

      const { data: links } = await (supabase as any).rpc("get_application_link_by_token", { _token: token });
      const link = Array.isArray(links) ? links[0] : null;

      if (!link) { setError("This application link is invalid or has expired."); setLoadingData(false); return; }
      if (link.expires_at && new Date(link.expires_at) < new Date()) { setError("This application link has expired."); setLoadingData(false); return; }

      const { data: prop } = await supabase
        .from("properties")
        .select("*")
        .eq("id", link.property_id)
        .maybeSingle();

      setLinkData(link);
      setProperty(prop);
      setLoadingData(false);
    };
    fetchLink();
  }, [token]);

  useEffect(() => {
    if (!loading && !user && !loadingData && !error) {
      // Redirect to signup with return URL
      navigate(`/signup?redirect=/apply/${token}`);
    }
  }, [loading, user, loadingData, error, navigate, token]);

  const handleApply = async () => {
    if (!user || !linkData || !property) return;

    if (profile?.role !== "tenant") {
      toast.error("Only tenants can apply for properties.");
      return;
    }

    setSubmitting(true);

    // Check for duplicate application
    const { data: existing } = await supabase
      .from("property_applications")
      .select("id")
      .eq("property_id", property.id)
      .eq("tenant_id", user.id)
      .maybeSingle();

    if (existing) {
      toast.info("You've already applied for this property.");
      setSubmitted(true);
      setSubmitting(false);
      return;
    }

    const { error: insertErr } = await supabase.from("property_applications").insert({
      property_id: property.id,
      tenant_id: user.id,
      landlord_id: linkData.landlord_id,
      message: message.trim() || null,
    } as any);

    setSubmitting(false);
    if (insertErr) {
      toast.error(insertErr.message);
    } else {
      toast.success("Application submitted! The landlord will review your profile.");
      setSubmitted(true);
    }
  };

  if (loadingData || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading property...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4">
        <div className="text-center">
          <Shield className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-foreground mb-2">Link Not Found</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild><Link to="/">Go Home</Link></Button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to TenCheck
        </Link>

        {/* Property Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-card overflow-hidden mb-6"
        >
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
                {property.is_available ? "Available" : "Taken"}
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
            {property.description && <p className="text-sm text-muted-foreground mt-3">{property.description}</p>}
          </div>
        </motion.div>

        {/* Application Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          {submitted ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Application Submitted!</h2>
              <p className="text-muted-foreground mb-6">The landlord will review your TenCheck profile and respond soon.</p>
              <Button asChild><Link to="/dashboard">Go to Dashboard</Link></Button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-lg font-bold text-foreground mb-1">Apply for This Property</h2>
              <p className="text-sm text-muted-foreground mb-5">Your TenCheck trust profile will be shared with the landlord.</p>

              <div className="rounded-xl bg-muted/50 border border-border/50 p-4 mb-5">
                <p className="text-sm font-medium text-foreground">Applying as: {profile?.name}</p>
                <p className="text-xs text-muted-foreground">{profile?.email}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Message to landlord (optional)</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Introduce yourself, mention when you'd like to move in, etc."
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

export default ApplyProperty;
