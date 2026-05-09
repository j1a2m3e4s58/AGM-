import { createActor } from "@/backend";
import { AnimatedAgmMark } from "@/components/AnimatedAgmMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/hooks/use-auth";
import { buildClient } from "@/lib/backend-client";
import { useAppActor } from "@/lib/use-app-actor";
import { Navigate, useLocation, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, Lock, User } from "lucide-react";
import { useEffect, useState } from "react";

type Mode = "login" | "reset";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user, sessionToken, mustChangePassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { actor } = useAppActor(createActor);
  const redirectTo =
    typeof location.search === "object" &&
    location.search &&
    "redirect" in location.search &&
    typeof location.search.redirect === "string"
      ? location.search.redirect
      : "/dashboard";

  async function performLogin() {
    if (!username.trim() || !password.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await login(username.trim(), password);
      if (result.mustChangePassword) {
        navigate({ to: "/change-password", replace: true });
      } else {
        navigate({ to: redirectTo, replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      showToast(
        msg.includes("Invalid")
          ? "Invalid username or password"
          : msg.includes("disabled")
            ? "Account is disabled"
            : msg,
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    await performLogin();
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !resetCode.trim() || !newPassword.trim()) return;
    if (newPassword.length < 10) {
      showToast(
        "Use at least 10 characters and include letters and numbers.",
        "error",
      );
      return;
    }
    if (!actor) {
      showToast("Backend not ready", "error");
      return;
    }
    setIsSubmitting(true);
    try {
      const client = buildClient(actor);
      await client.resetPassword(
        username.trim(),
        resetCode.trim(),
        newPassword,
      );
      showToast("Password reset successful. Please log in.", "success");
      setMode("login");
      setResetCode("");
      setNewPassword("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Reset failed";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sessionToken && user) {
    return (
      <Navigate
        to={mustChangePassword ? "/change-password" : redirectTo}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background decoration */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Branding */}
        <div className="text-center mb-6 sm:mb-8">
          <AnimatedAgmMark
            size={72}
            className="mx-auto mb-4"
            label="AGM installable app logo"
          />
          <h1 className="font-display text-2xl font-bold text-foreground">
            AGM Pro
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Annual General Meeting Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl shadow-elevated p-5 sm:p-6">
          {mode === "login" ? (
            <form onSubmit={handleLogin} noValidate>
              <h2 className="font-display font-semibold text-foreground mb-5">
                Sign In
              </h2>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="username"
                      type="text"
                      autoComplete="username"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9 min-h-[44px]"
                      data-ocid="login.username.input"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 pr-10 min-h-[44px]"
                      data-ocid="login.password.input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {/* Default creds hint */}
                  <p className="text-xs text-muted-foreground mt-1">
                    Default credentials:{" "}
                    <span className="font-mono">T4N4AMEG8F5</span>
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-5 min-h-[44px] font-semibold"
                disabled={isSubmitting || !username || !password}
                data-ocid="login.submit_button"
              >
                {isSubmitting ? "Signing in…" : "Sign In"}
              </Button>

              <button
                type="button"
                onClick={() => setMode("reset")}
                className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="login.forgot_password.link"
              >
                Forgot password?
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} noValidate>
              <div className="flex items-center gap-2 mb-5">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  ← Back
                </button>
                <h2 className="font-display font-semibold text-foreground">
                  Reset Password
                </h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-username"
                      type="text"
                      placeholder="Enter username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-9 min-h-[44px]"
                      data-ocid="login.reset_username.input"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="reset-code">Reset Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-code"
                      type="text"
                      placeholder="Enter reset code"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      className="pl-9 min-h-[44px]"
                      data-ocid="login.reset_code.input"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Contact your administrator for the reset code.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="At least 10 characters with letters and numbers"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="pl-9 pr-10 min-h-[44px]"
                      data-ocid="login.new_password.input"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showNewPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  New passwords must be at least 10 characters and include both
                  letters and numbers.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full mt-5 min-h-[44px] font-semibold"
                disabled={
                  isSubmitting || !username || !resetCode || !newPassword
                }
                data-ocid="login.reset_submit_button"
              >
                {isSubmitting ? "Resetting…" : "Reset Password"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
