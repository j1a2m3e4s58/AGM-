import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/hooks/use-auth";
import {
  CheckInMethod,
  ShareholderStatus,
  useAllCheckIns,
  useAllRegistrations,
  useAllShareholders,
  useCheckInShareholder,
  useRegistrationByShareholder,
  useUndoCheckIn,
} from "@/hooks/use-backend";
import { useQRScanner } from "@/lib/qr-code";
import { cn } from "@/lib/utils";
import type { CheckIn, Registration, Shareholder } from "@/types";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  QrCode,
  RefreshCw,
  RotateCcw,
  Search,
  SwitchCamera,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type CheckInMode = "scan" | "quick";
type ScanState = "idle" | "found" | "success" | "error";
const MAX_VISIBLE_QUICK_RESULTS = 500;

// ── Shared live counter ─────────────────────────────────────────────────────
function LiveCounter({
  checkedIn,
  totalRegistered,
}: { checkedIn: number; totalRegistered: number }) {
  return (
    <div
      data-ocid="checkin.counter_panel"
      className="flex flex-wrap items-center gap-4 bg-card border border-border px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        <span className="text-muted-foreground text-sm font-medium">
          Checked In:
        </span>
        <span className="text-2xl font-display font-bold text-primary">
          {checkedIn}
        </span>
      </div>
      <div className="text-muted-foreground">/</div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">
          Registered:
        </span>
        <span className="text-2xl font-display font-bold text-foreground">
          {totalRegistered}
        </span>
      </div>
      {totalRegistered > 0 && (
        <div className="ml-2">
          <div className="h-2 w-28 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-smooth"
              style={{
                width: `${Math.round((checkedIn / totalRegistered) * 100)}%`,
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 text-center">
            {Math.round((checkedIn / totalRegistered) * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}

// ── QR Scanner panel ────────────────────────────────────────────────────────
function ScanPanel({
  onCheckIn,
}: {
  onCheckIn: (shareholderId: string) => void;
}) {
  const {
    qrResults,
    isScanning,
    isActive,
    isSupported,
    error,
    isLoading,
    canStartScanning,
    startScanning,
    stopScanning,
    switchCamera,
    clearResults,
    videoRef,
    canvasRef,
  } = useQRScanner({
    facingMode: "environment",
    scanInterval: 150,
    maxResults: 1,
  });

  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    if (qrResults.length > 0) {
      const latest = qrResults[0];
      if (processedRef.current !== latest.data) {
        processedRef.current = latest.data;
        onCheckIn(latest.data);
        clearResults();
      }
    }
  }, [qrResults, onCheckIn, clearResults]);

  // Auto-start scanner when component mounts
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs only once on mount
  useEffect(() => {
    if (canStartScanning) {
      startScanning();
    }
    return () => {
      stopScanning();
    };
  }, [canStartScanning]);

  const isMobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Camera viewport */}
      <div className="relative bg-black rounded-2xl overflow-hidden aspect-video w-full max-w-lg mx-auto border-2 border-border">
        <video
          ref={videoRef}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          playsInline
          muted
        />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Scan overlay frame */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-52 h-52 relative">
              {["tl", "tr", "bl", "br"].map((corner) => (
                <div
                  key={corner}
                  className={cn(
                    "absolute w-8 h-8 border-4 border-primary",
                    corner === "tl" &&
                      "top-0 left-0 rounded-tl-lg border-r-0 border-b-0",
                    corner === "tr" &&
                      "top-0 right-0 rounded-tr-lg border-l-0 border-b-0",
                    corner === "bl" &&
                      "bottom-0 left-0 rounded-bl-lg border-r-0 border-t-0",
                    corner === "br" &&
                      "bottom-0 right-0 rounded-br-lg border-l-0 border-t-0",
                  )}
                />
              ))}
              <div className="absolute inset-x-2 h-0.5 bg-primary/80 top-1/2 animate-pulse" />
            </div>
          </div>
        )}

        {!isActive && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80">
            <QrCode className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Camera not active</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
        )}
      </div>

      {error && (
        <div
          data-ocid="checkin.scan.error_state"
          className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30"
        >
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-destructive">Camera Error</p>
            <p className="text-xs text-destructive/70 mt-0.5">
              {error.message}
            </p>
          </div>
        </div>
      )}

      {isSupported === false && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30">
          <p className="text-sm text-destructive">
            Camera is not supported on this device/browser.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!isActive ? (
          <Button
            onClick={startScanning}
            disabled={!canStartScanning || isLoading}
            className="min-h-[44px] flex-1 max-w-xs"
            data-ocid="checkin.scan.start_button"
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <QrCode className="w-4 h-4 mr-2" />
            )}
            {isLoading ? "Starting…" : "Start Scanner"}
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={stopScanning}
            disabled={isLoading}
            className="min-h-[44px] flex-1 max-w-xs"
            data-ocid="checkin.scan.stop_button"
          >
            Stop Scanner
          </Button>
        )}
        {isMobile && isActive && (
          <Button
            variant="outline"
            onClick={switchCamera}
            disabled={isLoading}
            className="min-h-[44px] min-w-[44px]"
            aria-label="Switch camera"
            data-ocid="checkin.scan.switch_camera_button"
          >
            <SwitchCamera className="w-4 h-4" />
          </Button>
        )}
      </div>

      {isScanning && (
        <p className="text-center text-sm text-muted-foreground animate-pulse">
          Hold QR code steady in front of camera…
        </p>
      )}
    </div>
  );
}

// ── Shareholder card for scan result ────────────────────────────────────────
function ScannedShareholderCard({
  shareholder,
  registration,
  scanState,
  onConfirmCheckIn,
  onReset,
  error,
}: {
  shareholder: Shareholder;
  registration: Registration | null;
  scanState: ScanState;
  onConfirmCheckIn: () => void;
  onReset: () => void;
  error: string | null;
}) {
  if (scanState === "success") {
    return (
      <div
        data-ocid="checkin.scan.success_state"
        className="flex flex-col items-center gap-4 p-8 bg-primary/10 border-2 border-primary rounded-2xl animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
        </div>
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-primary">
            CHECKED IN
          </p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {shareholder.fullName}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            #{shareholder.shareholderNumber}
          </p>
        </div>
        <Badge className="bg-primary/20 text-primary border border-primary/30">
          Via QR Scan
        </Badge>
        <p className="text-xs text-muted-foreground">
          Auto-resetting in 3 seconds…
        </p>
      </div>
    );
  }

  return (
    <div
      data-ocid="checkin.scan.shareholder_card"
      className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-display font-bold text-primary">
            {shareholder.fullName.slice(0, 1).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold text-foreground text-lg truncate">
            {shareholder.fullName}
          </p>
          <p className="text-sm text-muted-foreground">
            #{shareholder.shareholderNumber}
          </p>
          {registration && (
            <p className="text-xs text-muted-foreground mt-1">
              {registration.registrationType} · Code:{" "}
              <span className="font-mono font-medium text-foreground/80">
                {registration.verificationCode}
              </span>
            </p>
          )}
        </div>
        <StatusBadge status={shareholder.status} />
      </div>

      {error && (
        <div
          data-ocid="checkin.scan.inline_error_state"
          className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30"
        >
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onReset}
          className="min-h-[44px]"
          data-ocid="checkin.scan.reset_button"
        >
          Cancel
        </Button>
        {!error && (
          <Button
            onClick={onConfirmCheckIn}
            className="flex-1 min-h-[60px] text-lg font-bold bg-primary hover:bg-primary/90"
            data-ocid="checkin.scan.confirm_button"
          >
            <CheckCircle2 className="w-6 h-6 mr-2" />
            CHECK IN
          </Button>
        )}
        {error && (
          <Button
            variant="secondary"
            onClick={onReset}
            className="flex-1 min-h-[44px]"
            data-ocid="checkin.scan.scan_next_button"
          >
            Scan Next
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Quick mode row ───────────────────────────────────────────────────────────
function QuickRow({
  shareholder,
  onSelect,
  index,
}: {
  shareholder: Shareholder;
  onSelect: (sh: Shareholder) => void;
  index: number;
}) {
  return (
    <button
      type="button"
      data-ocid={`checkin.quick.item.${index + 1}`}
      onClick={() => onSelect(shareholder)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-smooth cursor-pointer text-left",
        shareholder.status === ShareholderStatus.CheckedIn
          ? "bg-primary/5 border-primary/20 opacity-60"
          : "bg-card border-border hover:border-primary/50 hover:bg-primary/5",
      )}
    >
      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-secondary-foreground">
          {shareholder.fullName.slice(0, 1).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate text-sm">
          {shareholder.fullName}
        </p>
        <p className="text-xs text-muted-foreground">
          #{shareholder.shareholderNumber}
        </p>
      </div>
      <StatusBadge status={shareholder.status} size="sm" />
    </button>
  );
}

// ── Confirm check-in dialog ──────────────────────────────────────────────────
function ConfirmDialog({
  shareholder,
  registration,
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  shareholder: Shareholder | null;
  registration: Registration | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  if (!shareholder) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm" data-ocid="checkin.quick.dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Confirm Check-In
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 p-4 bg-secondary rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">
                {shareholder.fullName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">
                {shareholder.fullName}
              </p>
              <p className="text-sm text-muted-foreground">
                #{shareholder.shareholderNumber}
              </p>
              {registration && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {registration.registrationType} ·{" "}
                  <span className="font-mono">
                    {registration.verificationCode}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 min-h-[44px]"
              data-ocid="checkin.quick.dialog.cancel_button"
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 min-h-[60px] text-base font-bold bg-primary hover:bg-primary/90"
              data-ocid="checkin.quick.dialog.confirm_button"
            >
              {isPending ? (
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-5 h-5 mr-2" />
              )}
              CHECK IN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Activity log entry ───────────────────────────────────────────────────────
function ActivityEntry({
  checkIn,
  shareholders,
  onUndo,
  index,
  canUndo,
}: {
  checkIn: CheckIn;
  shareholders: Shareholder[];
  onUndo: (shareholderId: string) => void;
  index: number;
  canUndo: boolean;
}) {
  const sh = shareholders.find((s) => s.id === checkIn.shareholderId);
  const timeMs = Number(checkIn.checkedInAt) / 1_000_000;
  const time = new Date(timeMs).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const methodLabel =
    checkIn.method === CheckInMethod.QRScan
      ? "QR"
      : checkIn.method === CheckInMethod.ManualQuick
        ? "Quick"
        : "Manual";

  return (
    <div
      data-ocid={`checkin.activity.item.${index + 1}`}
      className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {sh?.fullName ?? checkIn.shareholderId}
        </p>
        <p className="text-xs text-muted-foreground">
          {time} · {methodLabel} · by {checkIn.checkedInBy}
        </p>
      </div>
      {canUndo && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onUndo(checkIn.shareholderId)}
          className="min-h-[36px] text-muted-foreground hover:text-destructive text-xs gap-1 flex-shrink-0"
          data-ocid={`checkin.activity.undo_button.${index + 1}`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Undo
        </Button>
      )}
    </div>
  );
}

// ── Scan mode orchestrator ───────────────────────────────────────────────────
function ScanMode() {
  const { showToast } = useToast();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: allShareholders = [] } = useAllShareholders();
  const { data: allRegistrations = [] } = useAllRegistrations();
  const checkInMutation = useCheckInShareholder();

  const scannedShareholder = scannedId
    ? (allShareholders.find((s) => s.id === scannedId) ?? null)
    : null;

  const { data: scannedRegistration } = useRegistrationByShareholder(
    scannedId ?? "",
  );

  const reset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    setScanState("idle");
    setScannedId(null);
    setScanError(null);
  }, []);

  const handleScanned = useCallback(
    (data: string) => {
      if (scanState !== "idle") return;

      const matchingRegistration = allRegistrations.find(
        (registration) => registration.verificationCode === data,
      );

      const sh = allShareholders.find(
        (s) =>
          s.id === data ||
          s.shareholderNumber === data ||
          s.id === matchingRegistration?.shareholderId,
      );

      if (!sh) {
        setScannedId(data);
        setScanError("Shareholder not found in the system.");
        setScanState("found");
        return;
      }

      setScannedId(sh.id);
      setScanState("found");

      if (sh.status === ShareholderStatus.CheckedIn) {
        setScanError("Already checked in.");
        return;
      }
      if (sh.status === ShareholderStatus.NotRegistered) {
        setScanError("Shareholder is not registered. Please register first.");
        return;
      }
      setScanError(null);
    },
    [allRegistrations, allShareholders, scanState],
  );

  const handleConfirmCheckIn = useCallback(() => {
    if (!scannedShareholder || !scannedRegistration) return;
    checkInMutation.mutate(
      {
        shareholderId: scannedShareholder.id,
        registrationId: scannedRegistration.id,
        method: CheckInMethod.QRScan,
      },
      {
        onSuccess: () => {
          setScanState("success");
          resetTimerRef.current = setTimeout(reset, 3000);
        },
        onError: (err) => {
          setScanError(err instanceof Error ? err.message : "Check-in failed");
          showToast("Check-in failed. Please try again.", "error");
        },
      },
    );
  }, [
    scannedShareholder,
    scannedRegistration,
    checkInMutation,
    reset,
    showToast,
  ]);

  useEffect(
    () => () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    [],
  );

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      {scanState === "idle" && <ScanPanel onCheckIn={handleScanned} />}

      {scanState !== "idle" && scannedShareholder && (
        <ScannedShareholderCard
          shareholder={scannedShareholder}
          registration={scannedRegistration ?? null}
          scanState={scanState}
          onConfirmCheckIn={handleConfirmCheckIn}
          onReset={reset}
          error={scanError}
        />
      )}

      {scanState !== "idle" && !scannedShareholder && (
        <div
          data-ocid="checkin.scan.not_found_state"
          className="flex flex-col items-center gap-4 p-8 bg-destructive/10 border-2 border-destructive/30 rounded-2xl"
        >
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <div className="text-center">
            <p className="text-xl font-display font-bold text-destructive">
              Not Found
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No shareholder found for this QR code
            </p>
            <p className="text-xs text-muted-foreground font-mono mt-1 break-all">
              {scannedId}
            </p>
          </div>
          <Button
            onClick={reset}
            className="min-h-[44px]"
            data-ocid="checkin.scan.retry_button"
          >
            Try Again
          </Button>
        </div>
      )}

      {scannedId &&
        !scannedRegistration &&
        scannedShareholder &&
        scanState === "found" &&
        !scanError && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading registration data…
          </div>
        )}
    </div>
  );
}

// ── Quick mode orchestrator ──────────────────────────────────────────────────
function QuickMode() {
  const { showToast } = useToast();
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedShareholder, setSelectedShareholder] =
    useState<Shareholder | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: allShareholders = [], isLoading } = useAllShareholders();
  const { data: selectedRegistration } = useRegistrationByShareholder(
    selectedShareholder?.id ?? "",
  );
  const checkInMutation = useCheckInShareholder();
  const undoMutation = useUndoCheckIn();

  const filtered = allShareholders.filter((sh) => {
    const q = query.toLowerCase();
    const matchQuery =
      !q ||
      sh.fullName.toLowerCase().includes(q) ||
      sh.shareholderNumber.toLowerCase().includes(q);
    const matchStatus =
      showAll ||
      sh.status === ShareholderStatus.RegisteredInPerson ||
      sh.status === ShareholderStatus.RegisteredProxy;
    return matchQuery && matchStatus;
  });
  const visibleResults = filtered.slice(0, MAX_VISIBLE_QUICK_RESULTS);

  const handleSelect = useCallback((sh: Shareholder) => {
    if (sh.status === ShareholderStatus.CheckedIn) return;
    setSelectedShareholder(sh);
    setConfirmOpen(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedShareholder || !selectedRegistration) return;
    const name = selectedShareholder.fullName;
    checkInMutation.mutate(
      {
        shareholderId: selectedShareholder.id,
        registrationId: selectedRegistration.id,
        method: CheckInMethod.ManualQuick,
      },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          setSelectedShareholder(null);
          showToast(`${name} checked in successfully.`, "success");
        },
        onError: (err) => {
          showToast(
            err instanceof Error ? err.message : "Check-in failed",
            "error",
          );
        },
      },
    );
  }, [selectedShareholder, selectedRegistration, checkInMutation, showToast]);

  const _handleUndo = useCallback(
    (shareholderId: string) => {
      undoMutation.mutate(shareholderId, {
        onSuccess: () => showToast("Check-in undone.", "info"),
        onError: () => showToast("Failed to undo check-in.", "error"),
      });
    },
    [undoMutation, showToast],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          data-ocid="checkin.quick.search_input"
          placeholder="Search by name or shareholder number…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-12 min-h-[52px] text-base bg-card border-border focus:border-primary"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          data-ocid="checkin.quick.filter.toggle"
          onClick={() => setShowAll((v) => !v)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-smooth min-h-[36px]",
            showAll
              ? "bg-secondary border-border text-foreground"
              : "bg-primary/10 border-primary/30 text-primary",
          )}
        >
          <Zap className="w-3.5 h-3.5" />
          {showAll ? "All Shareholders" : "Registered Only"}
        </button>
        <span className="text-xs text-muted-foreground sm:text-right">
          {filtered.length.toLocaleString()} results
        </span>
      </div>

      {filtered.length > MAX_VISIBLE_QUICK_RESULTS && (
        <div className="text-xs text-muted-foreground">
          Showing first {MAX_VISIBLE_QUICK_RESULTS.toLocaleString()} matches while
          searching across all {filtered.length.toLocaleString()} results.
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[60px] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="checkin.quick.empty_state"
          className="flex flex-col items-center gap-3 py-12 text-center"
        >
          <Search className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            {query
              ? "No shareholders match your search"
              : "No registered shareholders"}
          </p>
          {!showAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(true)}
              className="min-h-[36px]"
            >
              Show All Shareholders
            </Button>
          )}
        </div>
      ) : (
        <ScrollArea className="h-[60vh] max-h-[420px] pr-2">
          <div className="flex flex-col gap-1.5">
            {visibleResults.map((sh, idx) => (
              <QuickRow
                key={sh.id}
                shareholder={sh}
                onSelect={handleSelect}
                index={idx}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      <ConfirmDialog
        shareholder={selectedShareholder}
        registration={selectedRegistration ?? null}
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setSelectedShareholder(null);
        }}
        onConfirm={handleConfirm}
        isPending={checkInMutation.isPending}
      />
    </div>
  );
}

// ── Activity log panel ───────────────────────────────────────────────────────
function ActivityLog() {
  const { showToast } = useToast();
  const { data: checkIns = [], isLoading } = useAllCheckIns();
  const { data: allShareholders = [] } = useAllShareholders();
  const undoMutation = useUndoCheckIn();

  const sorted = [...checkIns].sort(
    (a, b) => Number(b.checkedInAt) - Number(a.checkedInAt),
  );

  const handleUndo = useCallback(
    (shareholderId: string) => {
      undoMutation.mutate(shareholderId, {
        onSuccess: () => showToast("Check-in undone.", "info"),
        onError: () => showToast("Failed to undo check-in.", "error"),
      });
    },
    [undoMutation, showToast],
  );

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  const canUndoCheckIn = (checkIn: CheckIn) =>
    Number(checkIn.checkedInAt) / 1_000_000 > tenMinutesAgo;

  return (
    <div
      data-ocid="checkin.activity.panel"
      className="bg-card border border-border rounded-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <h3 className="font-display font-semibold text-foreground text-sm">
            Today's Check-In Activity
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {checkIns.length} check-ins
        </Badge>
      </div>
      <ScrollArea className="h-64">
        <div className="px-5 py-1">
          {isLoading ? (
            <div className="flex flex-col gap-2 py-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div
              data-ocid="checkin.activity.empty_state"
              className="flex flex-col items-center gap-2 py-8 text-center"
            >
              <Clock className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No check-ins yet today
              </p>
            </div>
          ) : (
            sorted.map((ci, idx) => (
              <ActivityEntry
                key={ci.id}
                checkIn={ci}
                shareholders={allShareholders}
                onUndo={handleUndo}
                index={idx}
                canUndo={canUndoCheckIn(ci)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CheckInPage() {
  const [mode, setMode] = useState<CheckInMode>("scan");
  const { data: checkIns = [], isLoading: checkInsLoading } = useAllCheckIns();
  const { data: allShareholders = [] } = useAllShareholders();

  const totalRegistered = allShareholders.filter(
    (s) =>
      s.status === ShareholderStatus.RegisteredInPerson ||
      s.status === ShareholderStatus.RegisteredProxy ||
      s.status === ShareholderStatus.CheckedIn,
  ).length;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Check-In
          </h1>
          <p className="text-sm text-muted-foreground">
            Fast shareholder attendance check-in
          </p>
        </div>

        {checkInsLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : (
          <LiveCounter
            checkedIn={checkIns.length}
            totalRegistered={totalRegistered}
          />
        )}

        <div
          data-ocid="checkin.mode.toggle"
          className="flex gap-1 p-1 bg-secondary"
        >
          <button
            type="button"
            data-ocid="checkin.mode.scan_tab"
            onClick={() => setMode("scan")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-smooth min-h-[44px]",
              mode === "scan"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <QrCode className="w-4 h-4" />
            Scan QR
          </button>
          <button
            type="button"
            data-ocid="checkin.mode.quick_tab"
            onClick={() => setMode("quick")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-smooth min-h-[44px]",
              mode === "quick"
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Zap className="w-4 h-4" />
            Quick
          </button>
        </div>

        <div className="bg-card border border-border p-4 sm:p-5">
          {mode === "scan" ? <ScanMode /> : <QuickMode />}
        </div>

        <ActivityLog />
      </div>
    </Layout>
  );
}
