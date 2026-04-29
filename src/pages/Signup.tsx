import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { PasswordStrengthIndicator, isPasswordStrong } from "@/components/PasswordStrengthIndicator";
import { explainAuthError } from "@/lib/authDiagnostics";

const roles = [
  { value: "tenant" as const, label: "Tenant" },
  { value: "landlord" as const, label: "Landlord" },
  { value: "service_worker" as const, label: "Service Worker" },
];

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"tenant" | "landlord" | "service_worker">("tenant");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  // If coming from an apply link, force tenant role
  useEffect(() => {
    if (redirectPath?.startsWith("/apply/")) {
      setRole("tenant");
    }
  }, [redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordStrong(password)) {
      toast.error("Password does not meet strength requirements");
      return;
    }
    setLoading(true);
    let error: any = null;
    try {
      const res = await signUp(email, password, { name, phone, role });
      error = res.error;
    } catch (e) {
      error = e;
    }
    setLoading(false);
    if (error) {
      toast.error(await explainAuthError(error));
    } else {
      toast.success("Account created! Check your email to confirm, then log in.");
      navigate(redirectPath ? `/login?redirect=${encodeURIComponent(redirectPath)}` : "/login");
    }
  };

  const roleLabel = roles.find(r => r.value === role)?.label?.toUpperCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4 py-12">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="glass-card rounded-2xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 font-display text-xl font-bold mb-6">
              <Shield className="h-6 w-6 text-primary" />
              TenCheck
            </Link>
            <h1 className="font-display text-2xl font-bold">Create your account</h1>
            <p className="text-muted-foreground text-sm mt-1">Start building rental trust today</p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2 mb-6">
            <Label className="text-sm font-medium">Register as:</Label>
            <div className="flex rounded-xl bg-muted p-1">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    role === r.value ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-primary text-center mt-2">
              You are registering as a {roleLabel}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Kamau" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            {role === "tenant" && (
              <div className="space-y-2">
                <Label htmlFor="nationalId">National ID</Label>
                <Input id="nationalId" placeholder="12345678" value={nationalId} onChange={(e) => setNationalId(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <PasswordStrengthIndicator password={password} />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !isPasswordStrong(password)}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>

        <div className="text-center mt-4">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
