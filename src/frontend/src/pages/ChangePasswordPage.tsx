import { createActor } from "@/backend";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/hooks/use-auth";
import { buildClient } from "@/lib/backend-client";
import { useAppActor } from "@/lib/use-app-actor";
import { useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, Lock, ShieldAlert, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] = useState("");
  const [tokenCode, setTokenCode] = useState("");
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const {
    user,
    requiresPhoneVerification,
    completeFirstTimeVerification,
    completePasswordChange,
    logout,
  } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { actor } = useAppActor(createActor);

  useEffect(() => {
    if (requiresPhoneVerification) {
      setPhoneConfirmation("");
      setShowVerificationDialog(true);
    }
  }, [requiresPhoneVerification]);

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
      await completePasswordChange();
      showToast("Password updated successfully", "success");
      setPhoneConfirmation("");
      setShowVerificationDialog(true);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to change password";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePhoneVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneConfirmation.trim() || !tokenCode.trim()) return;
    setIsVerifying(true);
    try {
      await completeFirstTimeVerification(
        phoneConfirmation.trim(),
        tokenCode.trim(),
      );
      showToast("Phone verified successfully", "success");
      setShowVerificationDialog(false);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to verify phone";
      showToast(msg, "error");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleReturnToLogin() {
    await logout();
    navigate({ to: "/login", replace: true });
  }

  async function handleVerificationDialogChange(open: boolean) {
    if (open || isVerifying) return;
    setShowVerificationDialog(false);
    await handleReturnToLogin();
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
            Set Your Own Password
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create a password you can remember, then complete one-time account verification.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-elevated p-5 sm:p-6">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="current-password">Temporary Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="current-password"
                  type={showCurrent ? "text" : "password"}
                  placeholder="Enter the current temporary password"
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
                  placeholder="Use letters, numbers, and at least 10 characters"
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
                  placeholder="Repeat the new password"
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
                  Passwords do not match.
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full mt-2 min-h-[44px] font-semibold"
              disabled={!isValid || isSubmitting}
              data-ocid="change_password.submit_button"
            >
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px]"
              onClick={handleReturnToLogin}
            >
              Return to Login
            </Button>
            <p className="text-xs text-muted-foreground">
              Use at least 10 characters and include both letters and numbers.
            </p>
          </form>
        </div>

        <Dialog
          open={showVerificationDialog}
          onOpenChange={handleVerificationDialogChange}
        >
          <DialogContent
            className="sm:max-w-md border-border/80 bg-card/98 p-0 overflow-hidden"
            data-ocid="change_password.phone_verify_modal"
          >
            <div className="border-b border-border/70 px-6 py-5">
              <DialogHeader className="space-y-2">
                <DialogTitle className="font-display flex items-center gap-2 text-xl">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Smartphone className="w-5 h-5" />
                  </span>
                  Verify your account
                </DialogTitle>
                <DialogDescription className="text-sm leading-6">
                  Enter the phone number your administrator added for this account, then use verification code{" "}
                  <span className="font-semibold text-foreground">1234</span>.
                </DialogDescription>
              </DialogHeader>
            </div>
            <form onSubmit={handlePhoneVerification} className="space-y-4 px-6 py-5">
              <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  One-time verification
                </p>
                <p className="mt-1 text-sm text-foreground/90">
                  Use the administrator-approved phone number already assigned to your account.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="verified-phone">Registered Phone Number</Label>
                <Input
                  id="verified-phone"
                  value={phoneConfirmation}
                  onChange={(e) => setPhoneConfirmation(e.target.value)}
                  placeholder="0241234567"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="verified-token">Verification Token</Label>
                <Input
                  id="verified-token"
                  value={tokenCode}
                  onChange={(e) => setTokenCode(e.target.value)}
                  placeholder="1234"
                />
              </div>
              <DialogFooter>
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={handleReturnToLogin}
                  >
                    Return to Login
                  </Button>
                  <Button
                    type="submit"
                    className="w-full sm:w-auto"
                    disabled={
                      isVerifying ||
                      !phoneConfirmation.trim() ||
                      !tokenCode.trim()
                    }
                  >
                    {isVerifying ? "Verifying..." : "Verify and Continue"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
