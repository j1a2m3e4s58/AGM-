import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/ToastContext";
import {
  useRegisterShareholder,
  useSettings,
  useUpdateRegistration,
  useValidateProxyProof,
} from "@/hooks/use-backend";
import { cn } from "@/lib/utils";
import { RegistrationType } from "@/types";
import type { Registration, Shareholder } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildRegistrationNotes,
  generatePreviewVerificationCode,
  getDefaultAgmYear,
  normalizePhone,
  validateGhanaCardId,
  validateGhanaPhone,
} from "./registration-form-utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read uploaded file"));
    reader.readAsDataURL(file);
  });
}

function detectFraudFlags(file: File): string[] {
  const flags: string[] = [];
  if (file.size < 1024) {
    flags.push("File too small — may not be a real document");
  }
  if (file.size > MAX_FILE_SIZE) {
    flags.push("File exceeds 10 MB limit");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    flags.push(`Unsupported format: ${file.type || "unknown"}`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (
    (file.type === "application/pdf" && ext !== "pdf") ||
    (file.type.startsWith("image/") &&
      !["jpg", "jpeg", "png", "webp"].includes(ext ?? ""))
  ) {
    flags.push("File extension does not match content type");
  }
  return flags;
}

interface ProxyFormProps {
  shareholder: Shareholder;
  onSuccess: (reg: Registration) => void;
}

interface FormErrors {
  shareholderContact?: string;
  proxyName?: string;
  proxyContact?: string;
  proxyGhanaCardId?: string;
  confirmProxyGhanaCardId?: string;
  relationship?: string;
  chitNumber?: string;
  proofFile?: string;
  consent?: string;
}

export function ProxyForm({ shareholder, onSuccess }: ProxyFormProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const registrations =
    queryClient.getQueryData<Registration[]>(["registrations"]) ?? [];
  const { data: settings } = useSettings();
  const register = useRegisterShareholder();
  const validateProxyProof = useValidateProxyProof();
  const updateRegistration = useUpdateRegistration();

  const [agmDate, setAgmDate] = useState(() => {
    const seedDate = settings?.agmDate || new Date().toISOString().slice(0, 10);
    return seedDate;
  });
  const agmYear = useMemo(() => getDefaultAgmYear(agmDate), [agmDate]);

  const [shareholderContact, setShareholderContact] = useState("");
  const [proxyName, setProxyName] = useState("");
  const [proxyContact, setProxyContact] = useState("");
  const [proxyGhanaCardId, setProxyGhanaCardId] = useState("");
  const [confirmProxyGhanaCardId, setConfirmProxyGhanaCardId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [chitNumber, setChitNumber] = useState("");
  const [relationship, setRelationship] = useState("");
  const [timeOfCheckIn, setTimeOfCheckIn] = useState(() =>
    new Date().toLocaleString(),
  );
  const [consentChecked, setConsentChecked] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fraudFlags, setFraudFlags] = useState<string[]>([]);
  const [validated, setValidated] = useState(false);
  const [validatedAt, setValidatedAt] = useState<number | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAgmDate(settings?.agmDate || new Date().toISOString().slice(0, 10));
    setVerificationCode(generatePreviewVerificationCode(registrations));
    setTimeOfCheckIn(new Date().toLocaleString());
    setShareholderContact("");
    setProxyName("");
    setProxyContact("");
    setProxyGhanaCardId("");
    setConfirmProxyGhanaCardId("");
    setRelationship("");
    setChitNumber(shareholder.shareholderNumber);
    setConsentChecked(false);
    setProofFile(null);
    setPreviewUrl(null);
    setFraudFlags([]);
    setValidated(false);
    setValidatedAt(null);
    setErrors({});
    setServerError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [settings?.agmDate, shareholder.id, shareholder.shareholderNumber]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setProofFile(file);
    setValidated(false);
    setValidatedAt(null);
    setFraudFlags([]);
    setErrors((prev) => ({ ...prev, proofFile: undefined }));

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setProofFile(null);
    setPreviewUrl(null);
    setFraudFlags([]);
    setValidated(false);
    setValidatedAt(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleValidate = async () => {
    if (!proofFile) {
      setErrors((prev) => ({
        ...prev,
        proofFile: "Please upload a proof document first",
      }));
      return;
    }
    setValidating(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const flags = detectFraudFlags(proofFile);
    setFraudFlags(flags);
    setValidated(true);
    setValidatedAt(Date.now());
    setValidating(false);
    if (flags.length === 0) {
      showToast("Proxy proof validated — no issues found", "success");
    } else {
      showToast(`${flags.length} fraud flag(s) detected`, "warning");
    }
  };

  function validate() {
    const nextErrors: FormErrors = {};
    const normalizedShareholderContact = normalizePhone(shareholderContact);
    const normalizedProxyContact = normalizePhone(proxyContact);
    const trimmedProxyCard = proxyGhanaCardId.trim().toUpperCase();
    const trimmedConfirmCard = confirmProxyGhanaCardId.trim().toUpperCase();

    if (!proofFile) {
      nextErrors.proofFile = "Proof of Proxy Nomination is required";
    } else if (!validated) {
      nextErrors.proofFile = "Please validate the uploaded proof before submitting";
    }

    if (!normalizedShareholderContact) {
      nextErrors.shareholderContact = "Shareholder Contact Number is required";
    } else if (!validateGhanaPhone(normalizedShareholderContact)) {
      nextErrors.shareholderContact = "Enter a valid Ghana phone number";
    }

    if (!proxyName.trim()) {
      nextErrors.proxyName = "Name of Proxy is required";
    }

    if (!normalizedProxyContact) {
      nextErrors.proxyContact = "Proxy Contact Number is required";
    } else if (!validateGhanaPhone(normalizedProxyContact)) {
      nextErrors.proxyContact = "Enter a valid Ghana phone number";
    }

    if (!trimmedProxyCard) {
      nextErrors.proxyGhanaCardId = "Proxy Ghana Card ID Number is required";
    } else if (!validateGhanaCardId(trimmedProxyCard)) {
      nextErrors.proxyGhanaCardId = "Use format like GHA-123456789-1";
    }

    if (!trimmedConfirmCard) {
      nextErrors.confirmProxyGhanaCardId =
        "Please confirm the Proxy Ghana Card ID Number";
    } else if (trimmedConfirmCard !== trimmedProxyCard) {
      nextErrors.confirmProxyGhanaCardId =
        "Proxy Ghana Card ID numbers do not match";
    }

    if (!relationship.trim()) {
      nextErrors.relationship = "Relationship to Shareholder is required";
    }

    if (!chitNumber.trim()) {
      nextErrors.chitNumber = "Chit Number is required";
    }

    if (!consentChecked) {
      nextErrors.consent = "Consent is required before registration";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setServerError(null);

    const proofPreview =
      proofFile && proofFile.type.startsWith("image/")
        ? await readFileAsDataUrl(proofFile)
        : "";
    const proofStorageKey = proofFile
      ? proofPreview || `proof_${shareholder.id}_${Date.now()}`
      : undefined;

    const registrationNotes = buildRegistrationNotes([
      ["AGM Year", agmYear],
      ["AGM Date", agmDate],
      ["Attendance Type", "Proxy"],
      ["Shareholder Name", shareholder.fullName],
      ["Shareholder Contact Number", normalizePhone(shareholderContact)],
      ["Name of Proxy", proxyName.trim()],
      ["Proxy Contact Number", normalizePhone(proxyContact)],
      ["Proxy Ghana Card ID Number", proxyGhanaCardId.trim().toUpperCase()],
      ["Relationship to Shareholder", relationship.trim()],
      ["Reserved Verification Code", verificationCode],
      ["Chit Number", chitNumber.trim()],
      ["Time of Check-in", timeOfCheckIn],
      ["Proof File", proofFile?.name ?? "Not uploaded"],
      ["Proof Preview", proofPreview],
      ["Consent Accepted", "Yes"],
    ]);

    try {
      const result = await register.mutateAsync({
        shareholderId: shareholder.id,
        regType: RegistrationType.Proxy,
        proxyData: {
          proxyName: proxyName.trim(),
          proxyContact: normalizePhone(proxyContact),
          proxyProofKey: proofStorageKey,
        },
      });

      await updateRegistration.mutateAsync({
        id: result.id,
        updates: {
          proxyData: {
            proxyName: proxyName.trim(),
            proxyContact: normalizePhone(proxyContact),
            proxyProofKey: proofStorageKey,
          },
          notes: registrationNotes,
        },
      });

      const reviewedRegistration = await validateProxyProof.mutateAsync({
        registrationId: result.id,
        validated: fraudFlags.length === 0,
        fraudFlags,
      });

      showToast("Proxy registered successfully!", "success");
      onSuccess(reviewedRegistration);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("REGISTRATION_IN_PROGRESS")) {
        setServerError(
          "Another officer is registering this shareholder. Please wait a moment and try again.",
        );
      } else if (msg.includes("ALREADY_REGISTERED")) {
        setServerError("This shareholder is already registered.");
      } else {
        setServerError(msg || "Registration failed. Please try again.");
      }
      showToast("Registration failed", "error");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5"
      data-ocid="registration.proxy_form"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proxy-agm-date" className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            AGM Date
          </Label>
          <Input
            id="proxy-agm-date"
            type="date"
            value={agmDate}
            onChange={(e) => setAgmDate(e.target.value)}
            data-ocid="registration.proxy.agm_date_input"
          />
        </div>
        <div className="space-y-1.5">
          <Label>AGM Year</Label>
          <Input value={agmYear} readOnly className="bg-muted/40" />
        </div>
        <div className="space-y-1.5">
          <Label>Time of Check-in</Label>
          <Input value={timeOfCheckIn} readOnly className="bg-muted/40" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Proof of Proxy Nomination <span className="text-destructive">*</span></Label>
        {!proofFile ? (
          <button
            type="button"
            data-ocid="registration.proof_dropzone"
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-smooth",
              errors.proofFile
                ? "border-destructive/60 bg-destructive/5"
                : "border-border hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">
              Upload PDF or image proof
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPEG, PNG, or WEBP up to 10 MB
            </p>
          </button>
        ) : (
          <div className="rounded-xl border border-border bg-muted/30 overflow-hidden">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Proof preview"
                  className="w-full max-h-48 object-contain bg-muted/20"
                />
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-2 right-2 w-8 h-8 bg-background/90 border border-border flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4">
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {proofFile.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileChange}
          className="hidden"
          data-ocid="registration.proof_upload_button"
        />
        {errors.proofFile && (
          <p className="text-xs text-destructive">{errors.proofFile}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Name of Shareholder</Label>
        <Input value={shareholder.fullName} readOnly className="bg-muted/40" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="proxy-shareholder-contact">
          Shareholder Contact Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="proxy-shareholder-contact"
          value={shareholderContact}
          onChange={(e) => setShareholderContact(e.target.value)}
          placeholder="0241234567 or +233241234567"
          data-ocid="registration.proxy.shareholder_contact_input"
        />
        {errors.shareholderContact && (
          <p className="text-xs text-destructive">
            {errors.shareholderContact}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proxy-name">
            Name of Proxy <span className="text-destructive">*</span>
          </Label>
          <Input
            id="proxy-name"
            value={proxyName}
            onChange={(e) => setProxyName(e.target.value)}
            placeholder="Full name of proxy"
            data-ocid="registration.proxy_name_input"
          />
          {errors.proxyName && (
            <p className="text-xs text-destructive">{errors.proxyName}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proxy-contact">
            Proxy Contact Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="proxy-contact"
            value={proxyContact}
            onChange={(e) => setProxyContact(e.target.value)}
            placeholder="0241234567 or +233241234567"
            data-ocid="registration.proxy_contact_input"
          />
          {errors.proxyContact && (
            <p className="text-xs text-destructive">{errors.proxyContact}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="proxy-ghana-card">
            Proxy Ghana Card ID Number{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="proxy-ghana-card"
            value={proxyGhanaCardId}
            onChange={(e) => setProxyGhanaCardId(e.target.value.toUpperCase())}
            placeholder="GHA-123456789-1"
            data-ocid="registration.proxy.ghana_card_input"
          />
          {errors.proxyGhanaCardId && (
            <p className="text-xs text-destructive">
              {errors.proxyGhanaCardId}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proxy-confirm-ghana-card">
            Confirm Proxy Ghana Card ID Number{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="proxy-confirm-ghana-card"
            value={confirmProxyGhanaCardId}
            onChange={(e) =>
              setConfirmProxyGhanaCardId(e.target.value.toUpperCase())
            }
            placeholder="Repeat Proxy Ghana Card ID"
            data-ocid="registration.proxy.confirm_ghana_card_input"
          />
          {errors.confirmProxyGhanaCardId && (
            <p className="text-xs text-destructive">
              {errors.confirmProxyGhanaCardId}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5" />
            Verification Code
          </Label>
          <Input
            value={verificationCode}
            readOnly
            className="bg-muted/40 font-mono tracking-wide"
            data-ocid="registration.proxy.verification_code"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proxy-chit-number">
            Chit Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="proxy-chit-number"
            value={chitNumber}
            onChange={(e) => setChitNumber(e.target.value)}
            placeholder="Member number / chit number"
            data-ocid="registration.proxy.chit_number_input"
          />
          <p className="text-xs text-muted-foreground">
            Auto-filled from the member number in the uploaded list.
          </p>
          {errors.chitNumber && (
            <p className="text-xs text-destructive">{errors.chitNumber}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="proxy-relationship">
          Relationship to Shareholder <span className="text-destructive">*</span>
        </Label>
        <Input
          id="proxy-relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder="e.g. Spouse, Child, Lawyer, Director"
          data-ocid="registration.proxy.relationship_input"
        />
        {errors.relationship && (
          <p className="text-xs text-destructive">{errors.relationship}</p>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--primary)]"
          data-ocid="registration.proxy.consent_checkbox"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            Signature / Consent
          </p>
          <p className="text-xs text-muted-foreground">
            I confirm the proxy information above is accurate and the proxy
            nomination documentation has been reviewed.
          </p>
          {errors.consent && (
            <p className="text-xs text-destructive mt-1">{errors.consent}</p>
          )}
        </div>
      </label>

      {fraudFlags.length > 0 && (
        <div
          className="rounded-lg border border-amber-800/60 bg-amber-950/30 p-4 space-y-2"
          data-ocid="registration.fraud_flags"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-semibold">
              {fraudFlags.length} Fraud Flag(s) Detected
            </span>
          </div>
          <ul className="space-y-1">
            {fraudFlags.map((flag) => (
              <li key={flag} className="text-xs text-amber-300/80">
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {validated && fraudFlags.length === 0 && (
        <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-primary">
            Proof validated — no issues detected
          </p>
        </div>
      )}

      {validatedAt && (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          Proof reviewed locally at {new Date(validatedAt).toLocaleString()}.
        </div>
      )}

      {proofFile && (
        <Button
          type="button"
          variant="outline"
          onClick={handleValidate}
          disabled={validating}
          className="w-full h-11"
          data-ocid="registration.validate_proof_button"
        >
          {validating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Validating…
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Validate Proxy Proof
            </>
          )}
        </Button>
      )}

      {serverError && (
        <div
          className="flex gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
          data-ocid="registration.proxy.error_state"
        >
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      <Button
        type="submit"
        data-ocid="registration.proxy_submit_button"
        disabled={
          register.isPending ||
          validateProxyProof.isPending ||
          updateRegistration.isPending
        }
        className="w-full h-12 text-base font-semibold"
      >
        {register.isPending ||
        validateProxyProof.isPending ||
        updateRegistration.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Registering…
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Register Proxy
          </>
        )}
      </Button>
    </form>
  );
}
