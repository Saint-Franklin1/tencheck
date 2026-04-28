import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MapPin, Bed, Bath, Shield, MessageSquare, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentImg, setCurrentImg] = useState(0);
  const [showInquiry, setShowInquiry] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ["property-detail", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id!)
        .single();
      return data;
      return data;
    },
    enabled: !!id,
  });

  const { data: landlordProfile } = useQuery({
    queryKey: ["landlord-profile", property?.landlord_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", property!.landlord_id)
        .maybeSingle();
      return data;
    },
    enabled: !!property?.landlord_id,
  });

  const { data: landlordRecord } = useQuery({
    queryKey: ["landlord-record", property?.landlord_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("landlords")
        .select("verification_status")
        .eq("user_id", property!.landlord_id)
        .maybeSingle();
      return data;
    },
    enabled: !!property?.landlord_id,
  });

  const sendInquiry = async () => {
    if (!user) {
      toast.error("Please log in to send an inquiry");
      navigate("/login");
      return;
    }
    if (!message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("inquiries").insert({
      tenant_id: user.id,
      property_id: id!,
      message,
    });
    setSending(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Inquiry sent! The landlord will be notified.");
      setShowInquiry(false);
      setMessage("");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 container mx-auto px-4 max-w-4xl">
          <div className="h-96 rounded-2xl bg-muted animate-pulse mb-6" />
          <div className="h-8 w-1/2 bg-muted animate-pulse rounded mb-3" />
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 container mx-auto px-4 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Property Not Found</h1>
          <p className="text-muted-foreground mb-4">This listing may have been removed.</p>
          <Button asChild><Link to="/properties">Browse Properties</Link></Button>
        </div>
      </div>
    );
  }

  const images = property.images?.length ? property.images : ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=600&fit=crop"];
  const isVerified = landlordRecord?.verification_status === "verified";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back */}
          <Link to="/properties" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to listings
          </Link>

          {/* Image Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-2xl overflow-hidden bg-muted mb-8"
          >
            <div className="aspect-[16/9]">
              <img
                src={images[currentImg]}
                alt={`${property.title} - Photo ${currentImg + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImg((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentImg((prev) => (prev + 1) % images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-foreground/60 text-background flex items-center justify-center hover:bg-foreground/80 transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {images.map((_: string, i: number) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImg(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === currentImg ? "w-6 bg-background" : "w-2 bg-background/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            {isVerified && (
              <Badge className="absolute top-4 right-4 bg-primary/90 text-primary-foreground gap-1">
                <Shield className="h-3 w-3" /> Verified Landlord
              </Badge>
            )}
          </motion.div>

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">{property.title}</h1>
                <div className="flex items-center gap-1.5 text-muted-foreground mt-2">
                  <MapPin className="h-4 w-4" />
                  <span>{property.location}</span>
                </div>
              </motion.div>

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{property.bedrooms} Bedroom{property.bedrooms !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 border border-border">
                  <Bath className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{property.bathrooms} Bathroom{property.bathrooms !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {property.description && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <h2 className="font-display font-bold text-lg text-foreground mb-2">Description</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.description}</p>
                </motion.div>
              )}

              {landlordProfile?.name && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center">
                    <span className="font-display font-bold text-sm text-accent-foreground">
                      {landlordProfile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{landlordProfile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isVerified ? "Verified Landlord" : "Landlord"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-4"
            >
              <div className="rounded-2xl border border-border bg-card p-6 sticky top-24">
                <p className="font-display text-3xl font-bold text-foreground">
                  Ksh {property.rent_amount.toLocaleString()}
                  <span className="text-base font-normal text-muted-foreground">/mo</span>
                </p>

                {showInquiry ? (
                  <div className="mt-5 space-y-3">
                    <Textarea
                      placeholder="Hi, I'm interested in this property..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2">
                      <Button className="flex-1 gap-2" onClick={sendInquiry} disabled={sending}>
                        <MessageSquare className="h-4 w-4" />
                        {sending ? "Sending..." : "Send Inquiry"}
                      </Button>
                      <Button variant="outline" onClick={() => setShowInquiry(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-2">
                    <Button className="w-full gap-2" onClick={() => navigate(`/properties/${id}/apply`)}>
                      <Shield className="h-4 w-4" /> Apply Now
                    </Button>
                    <Button variant="outline" className="w-full gap-2" onClick={() => setShowInquiry(true)}>
                      <MessageSquare className="h-4 w-4" /> Message Landlord
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PropertyDetail;
