import { createActor } from "@/backend";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/hooks/use-auth";
import { buildClient } from "@/lib/backend-client";
import { useAppActor } from "@/lib/use-app-actor";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { actor } = useAppActor(createActor);

  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isValid =
    currentPassword.length > 0 &&
    newPassword.length >= 10 &&
    newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !actor || !user) return;
    setIsSubmitting(true);
    try {
      const client = buildClient(actor);
      await client.changePassword(user.username, currentPassword, newPassword);
      showToast("Password changed successfully", "success");
      // Logout and redirect to re-authenticate
      await logout();
      navigate({ to: "/login" });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to change password";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden
      >
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 mb-4">
            <ShieldAlert className="w-7 h-7 text-accent" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">
            Change Password Required
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            You must set a new password before continuing.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-elevated p-5 sm:p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-9 pr-10 min-h-[44px]"
                  data-ocid="change_password.current.input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showCurrent ? "Hide" : "Show"}
                >
                  {showCurrent ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNew ? "text" : "password"}
                  placeholder="At least 10 characters with letters and numbers"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9 pr-10 min-h-[44px]"
                  data-ocid="change_password.new.input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showNew ? "Hide" : "Show"}
                >
                  {showNew ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`pl-9 min-h-[44px] ${passwordMismatch ? "border-destructive" : ""}`}
                  data-ocid="change_password.confirm.input"
                  required
                />
              </div>
              {passwordMismatch && (
                <p
                  className="text-xs text-destructive"
                  data-ocid="change_password.mismatch.error_state"
                >
                  Passwords do not match
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2 min-h-[44px] font-semibold"
              disabled={!isValid || isSubmitting}
              data-ocid="change_password.submit_button"
            >
              {isSubmitting ? "Updating…" : "Set New Password"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Use at least 10 characters and include both letters and numbers.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
