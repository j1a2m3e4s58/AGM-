import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/context/ToastContext";
import {
  useRegisterShareholder,
  useSettings,
  useUpdateRegistration,
} from "@/hooks/use-backend";
import { RegistrationType } from "@/types";
import type { Registration, Shareholder } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildRegistrationNotes,
  generatePreviewVerificationCode,
  getDefaultAgmYear,
  normalizePhone,
  validateGhanaCardId,
  validateGhanaPhone,
} from "./registration-form-utils";

interface InPersonFormProps {
  shareholder: Shareholder;
  onSuccess: (reg: Registration) => void;
}

interface FormErrors {
  phone?: string;
  ghanaCardId?: string;
  confirmGhanaCardId?: string;
  chitNumber?: string;
  consent?: string;
}

export function InPersonForm({ shareholder, onSuccess }: InPersonFormProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const registrations =
    queryClient.getQueryData<Registration[]>(["registrations"]) ?? [];
  const { data: settings } = useSettings();
  const register = useRegisterShareholder();
  const updateRegistration = useUpdateRegistration();

  const [agmDate, setAgmDate] = useState(() => {
    const seedDate = settings?.agmDate || new Date().toISOString().slice(0, 10);
    return seedDate;
  });
  const agmYear = useMemo(() => getDefaultAgmYear(agmDate), [agmDate]);

  const [phone, setPhone] = useState("");
  const [ghanaCardId, setGhanaCardId] = useState("");
  const [confirmGhanaCardId, setConfirmGhanaCardId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [chitNumber, setChitNumber] = useState("");
  const [timeOfCheckIn, setTimeOfCheckIn] = useState(() =>
    new Date().toLocaleString(),
  );
  const [consentChecked, setConsentChecked] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setAgmDate(settings?.agmDate || new Date().toISOString().slice(0, 10));
    setVerificationCode(generatePreviewVerificationCode(registrations));
    setTimeOfCheckIn(new Date().toLocaleString());
    setPhone("");
    setGhanaCardId("");
    setConfirmGhanaCardId("");
    setChitNumber(shareholder.shareholderNumber);
    setConsentChecked(false);
    setErrors({});
    setServerError(null);
  }, [settings?.agmDate, shareholder.id, shareholder.shareholderNumber]);

  function validate() {
    const nextErrors: FormErrors = {};
    const normalizedPhone = normalizePhone(phone);
    const trimmedCard = ghanaCardId.trim().toUpperCase();
    const trimmedConfirmCard = confirmGhanaCardId.trim().toUpperCase();

    if (!normalizedPhone) {
      nextErrors.phone = "Telephone number is required";
    } else if (!validateGhanaPhone(normalizedPhone)) {
      nextErrors.phone = "Enter a valid Ghana phone number";
    }

    if (!trimmedCard) {
      nextErrors.ghanaCardId = "Ghana Card ID Number is required";
    } else if (!validateGhanaCardId(trimmedCard)) {
      nextErrors.ghanaCardId = "Use format like GHA-123456789-1";
    }

    if (!trimmedConfirmCard) {
      nextErrors.confirmGhanaCardId =
        "Please confirm the Ghana Card ID Number";
    } else if (trimmedConfirmCard !== trimmedCard) {
      nextErrors.confirmGhanaCardId = "Ghana Card ID numbers do not match";
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
    setServerError(null);

    if (!validate()) return;

    const registrationNotes = buildRegistrationNotes([
      ["AGM Year", agmYear],
      ["AGM Date", agmDate],
      ["Attendance Type", "In Person"],
      ["Shareholder Name", shareholder.fullName],
      ["Telephone Number", normalizePhone(phone)],
      ["Ghana Card ID Number", ghanaCardId.trim().toUpperCase()],
      ["Reserved Verification Code", verificationCode],
      ["Chit Number", chitNumber.trim()],
      ["Time of Check-in", timeOfCheckIn],
      ["Consent Accepted", "Yes"],
    ]);

    try {
      const result = await register.mutateAsync({
        shareholderId: shareholder.id,
        regType: RegistrationType.InPerson,
        proxyData: null,
      });

      const updated = await updateRegistration.mutateAsync({
        id: result.id,
        updates: { notes: registrationNotes },
      });

      showToast("Shareholder registered successfully!", "success");
      onSuccess(updated);
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
      data-ocid="registration.inperson_form"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inperson-agm-date" className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            AGM Date
          </Label>
          <Input
            id="inperson-agm-date"
            type="date"
            value={agmDate}
            onChange={(e) => setAgmDate(e.target.value)}
            data-ocid="registration.inperson.agm_date_input"
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
        <Label>Shareholder Name</Label>
        <Input value={shareholder.fullName} readOnly className="bg-muted/40" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="inperson-phone">
          Telephone Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="inperson-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0241234567 or +233241234567"
          data-ocid="registration.inperson.phone_input"
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="inperson-ghana-card">
            Ghana Card ID Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inperson-ghana-card"
            value={ghanaCardId}
            onChange={(e) => setGhanaCardId(e.target.value.toUpperCase())}
            placeholder="GHA-123456789-1"
            data-ocid="registration.inperson.ghana_card_input"
          />
          {errors.ghanaCardId && (
            <p className="text-xs text-destructive">{errors.ghanaCardId}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inperson-confirm-ghana-card">
            Confirm Ghana Card ID Number{" "}
            <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inperson-confirm-ghana-card"
            value={confirmGhanaCardId}
            onChange={(e) =>
              setConfirmGhanaCardId(e.target.value.toUpperCase())
            }
            placeholder="Repeat Ghana Card ID"
            data-ocid="registration.inperson.confirm_ghana_card_input"
          />
          {errors.confirmGhanaCardId && (
            <p className="text-xs text-destructive">
              {errors.confirmGhanaCardId}
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
            data-ocid="registration.inperson.verification_code"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="inperson-chit-number">
            Chit Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id="inperson-chit-number"
            value={chitNumber}
            onChange={(e) => setChitNumber(e.target.value)}
            placeholder="Member number / chit number"
            data-ocid="registration.inperson.chit_number_input"
          />
          <p className="text-xs text-muted-foreground">
            Auto-filled from the member number in the uploaded list.
          </p>
          {errors.chitNumber && (
            <p className="text-xs text-destructive">{errors.chitNumber}</p>
          )}
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--primary)]"
          data-ocid="registration.inperson.consent_checkbox"
        />
        <div>
          <p className="text-sm font-medium text-foreground">
            Signature / Consent
          </p>
          <p className="text-xs text-muted-foreground">
            I confirm the shareholder information above is accurate and the
            shareholder has consented to attendance processing.
          </p>
          {errors.consent && (
            <p className="text-xs text-destructive mt-1">{errors.consent}</p>
          )}
        </div>
      </label>

      {serverError && (
        <div
          className="flex gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3"
          data-ocid="registration.error_state"
        >
          <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{serverError}</p>
        </div>
      )}

      <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
        <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-primary">
          A unique verification code has been reserved for this registration
          form and will be finalized on save.
        </p>
      </div>

      <Button
        type="submit"
        data-ocid="registration.inperson_submit_button"
        disabled={register.isPending || updateRegistration.isPending}
        className="w-full h-12 text-base font-semibold"
      >
        {register.isPending || updateRegistration.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Registering…
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Register In Person
          </>
        )}
      </Button>
    </form>
  );
}
