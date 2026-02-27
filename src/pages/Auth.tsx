import { useCallback, useRef } from "react";
import { useMousePosition } from "@/hooks/use-mouse-position";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeError } from "@/lib/sanitize-error";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Mail, Lock, ArrowRight, Check } from "lucide-react";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();

  // ── SHINY GLOW ADDED HERE ──
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const update = useCallback(({ x, y }: { x: number; y: number }) => {
    if (!overlayRef.current) return;
    const { width, height } = overlayRef.current.getBoundingClientRect();
    overlayRef.current.style.setProperty("--x", `${x - width / 2}px`);
    overlayRef.current.style.setProperty("--y", `${y - height / 2}px`);
  }, []);

  useMousePosition(containerRef, update);
  // ── END SHINY GLOW SETUP ──

  useEffect(() => {
    if (session) navigate("/feed", { replace: true });
  }, [session, navigate]);

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const showMismatch = !isLogin && confirmPassword.length > 0 && !passwordsMatch;

  const validateEmailDomain = async (email: string): Promise<boolean> => {
    const domain = email.split("@")[1];
    if (!domain) return false;
    const { data } = await supabase.from("universities").select("id").contains("email_domains", [domain]);
    return (data?.length ?? 0) > 0;
  };

  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
      toast.success("Check your email for the reset link!");
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      if (!isLogin) {
        const isValid = await validateEmailDomain(email);
        if (!isValid) {
          toast.error("Your email domain isn't registered with any university. Contact your admin.");
          setLoading(false);
          return;
        }
      }
      if (isLogin) {
        

        // If it doesn't look like an email, use the secure edge function
        if (!email.includes("@")) {
          const res = await supabase.functions.invoke("login-with-username", {
            body: { username: email, password },
          });

          if (res.error || !res.data?.session) {
            toast.error("Invalid username or password");
            setLoading(false);
            return;
          }

          // Set the session from the edge function response
          const { error: sessionError } = await supabase.auth.setSession(res.data.session);
          if (sessionError) throw sessionError;
          toast.success("Welcome back!");
        } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
          toast.success("Welcome back!");
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to verify your account!");
      }
    } catch (error: any) {
      toast.error(sanitizeError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    // ── OUTER DIV CHANGED: added ref={containerRef} and relative + overflow-hidden ──
    <div
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center px-4 bg-background overflow-hidden"
    >
      {/* ── SHINY GLOW OVERLAY ADDED HERE ── */}
      {/* ── SHINY GLOW OVERLAY ADDED HERE ── */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute rounded-full blur-[60px] z-0"
        style={{
          width: "600px",
          height: "600px",
          top: 0,
          left: 0,
          background: "radial-gradient(circle, rgba(124,58,237,0.5) 0%, rgba(236,72,153,0.3) 50%, transparent 70%)",
          transform: "translate(var(--x), var(--y))",
          opacity: 1,
          willChange: "transform",
        }}
      />
      {/* ── END GLOW OVERLAY ── */}
      {/* ── END GLOW OVERLAY ── */}

      {/* ── CONTENT WRAPPED IN z-10 SO IT SITS ABOVE THE GLOW ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="mb-10 text-center">
          <h1 className="text-6xl font-extrabold tracking-tight text-foreground">T</h1>
          <p className="mt-2 text-sm text-muted-foreground">Your campus. Your people. Your gossip.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                  {isLogin ? "Email or Username" : "University Email"}
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type={isLogin ? "text" : "email"}
                    placeholder={isLogin ? "you@university.ac.uk or username" : "you@university.ac.uk"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-xs text-muted-foreground uppercase tracking-wider font-medium"
                >
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="pl-10 h-11 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              {!isLogin && (
                <div className="space-y-2">
                  <Label
                    htmlFor="confirmPassword"
                    className="text-xs text-muted-foreground uppercase tracking-wider font-medium"
                  >
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-10 h-11 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground"
                    />
                    {passwordsMatch && (
                      <Check className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                    )}
                  </div>
                  {showMismatch && <p className="text-xs text-destructive font-medium">Passwords do not match</p>}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || (!isLogin && !passwordsMatch)}
                className="w-full h-11 rounded-full bg-foreground text-background font-semibold text-sm disabled:opacity-40 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? "Sign In" : "Create Account"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </motion.form>
          </AnimatePresence>

          {forgotMode ? (
            <form onSubmit={handleForgotPassword} className="mt-4 space-y-4">
              {resetSent ? (
                <p className="text-sm text-center text-muted-foreground">
                  Reset link sent! Check your inbox.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your email and we'll send a reset link.
                  </p>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-11 rounded-full bg-foreground text-background font-semibold text-sm disabled:opacity-40 transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
                  </button>
                </>
              )}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setForgotMode(false); setResetSent(false); }}
                  className="text-sm text-primary hover:underline transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 text-center space-y-2">
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setForgotMode(true)}
                  className="text-sm text-muted-foreground hover:text-primary hover:underline transition-colors block mx-auto"
                >
                  Forgot password?
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setConfirmPassword("");
                }}
                className="text-sm text-primary hover:underline transition-colors"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
