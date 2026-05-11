import { AgmYearSwitcher } from "@/components/AgmYearSwitcher";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgmYear } from "@/context/AgmYearContext";
import { useAuth } from "@/hooks/use-auth";
import {
  useAllRegistrations,
  useAllShareholders,
  useAuditLogForExport,
  useSettings,
} from "@/hooks/use-backend";
import { filterRegistrationsByYear } from "@/lib/agm-year";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardCheck,
  FileBarChart2,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { useMemo } from "react";

type RehearsalStep = {
  title: string;
  description: string;
  done: boolean;
  to: string;
  cta: string;
  icon: typeof Upload;
};

function SummaryCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="space-y-2 p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-3xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  index,
  step,
}: {
  index: number;
  step: RehearsalStep;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center border border-primary/30 bg-primary/10">
            <step.icon className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-semibold text-foreground">
                Step {index + 1}: {step.title}
              </p>
              <Badge variant={step.done ? "default" : "secondary"}>
                {step.done ? "Ready" : "Pending"}
              </Badge>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
        </div>
        <Link to={step.to}>
          <Button variant="outline" className="min-h-[44px] gap-2">
            {step.cta}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export default function RehearsalPage() {
  const { activeYear } = useAgmYear();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { data: shareholders = [] } = useAllShareholders();
  const { data: registrations = [] } = useAllRegistrations();
  const { data: auditEntries = [] } = useAuditLogForExport();

  const registrationsForYear = filterRegistrationsByYear(registrations, activeYear);
  const auditForYear = useMemo(
    () =>
      auditEntries.filter((entry) =>
        entry.details?.includes(`AGM Year: ${activeYear}`) ||
        entry.details?.includes(`AGM ${activeYear}`),
      ),
    [activeYear, auditEntries],
  );

  const steps = useMemo<RehearsalStep[]>(
    () => [
      {
        title: "Prepare AGM settings",
        description:
          "Confirm AGM name, venue, quorum threshold, and all event controls before rehearsal begins.",
        done: Boolean(settings?.agmName && settings?.venue),
        to: "/admin",
        cta: "Open Admin",
        icon: ShieldCheck,
      },
      {
        title: "Load shareholder register",
        description:
          "Make sure the AGM year has a ready shareholder register and import history for this cycle.",
        done: shareholders.length > 0,
        to: "/import",
        cta: "Open Import",
        icon: Upload,
      },
      {
        title: "Test live registration",
        description:
          "Complete at least one registration for this AGM year and confirm the person leaves the registration queue immediately.",
        done: registrationsForYear.length > 0,
        to: "/registration",
        cta: "Open Registration",
        icon: ClipboardCheck,
      },
      {
        title: "Verify shareholder record",
        description:
          "Review the saved record, proxy details, verification code, and PDF export quality on the Shareholders page.",
        done: registrationsForYear.length > 0,
        to: "/shareholders",
        cta: "Open Shareholders",
        icon: Users,
      },
      {
        title: "Confirm reporting and audit trail",
        description:
          "Generate year-specific reports and confirm audit entries reflect the activity completed during rehearsal.",
        done: registrationsForYear.length > 0 && auditForYear.length > 0,
        to: "/reports",
        cta: "Open Reports",
        icon: FileBarChart2,
      },
    ],
    [
      activeYear,
      auditForYear.length,
      registrationsForYear.length,
      settings?.agmName,
      settings?.venue,
      shareholders.length,
    ],
  );

  const completedCount = steps.filter((step) => step.done).length;
  const readinessPct = Math.round((completedCount / steps.length) * 100);

  return (
    <Layout>
      <div className="mx-auto max-w-6xl space-y-6" data-ocid="rehearsal.page">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
              Executive Rehearsal
            </p>
            <h1 className="font-display text-2xl font-bold text-foreground">
              AGM {activeYear} Live Readiness Command Sheet
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Use this rehearsal screen to prove that login, registration, records,
              exports, and audit visibility are all ready before the actual AGM begins.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <AgmYearSwitcher compact />
            <Link to="/board">
              <Button className="min-h-[44px] gap-2">
                <PlayCircle className="h-4 w-4" />
                Open Board View
              </Button>
            </Link>
          </div>
        </div>

        <Card className="border-primary/25 bg-primary/10">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                  Rehearsal Lead
                </span>
              </div>
              <p className="text-lg font-display font-semibold text-foreground">
                Signed in as {user?.username ?? "Operator"}
              </p>
              <p className="text-sm text-muted-foreground">
                Walk through each step below and only mark AGM {activeYear} live when the
                registration flow, shareholder record, year-specific reporting, and audit
                record all behave correctly.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <SummaryCard
                label="Steps Ready"
                value={`${completedCount}/${steps.length}`}
                helper="Completed checklist steps"
              />
              <SummaryCard
                label="Readiness"
                value={`${readinessPct}%`}
                helper="Current rehearsal completion"
              />
              <SummaryCard
                label="AGM Year"
                value={activeYear}
                helper="Active rehearsal cycle"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.95fr]">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRoundCheck className="h-4 w-4 text-primary" />
                Rehearsal Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step, index) => (
                <StepCard key={step.title} index={index} step={step} />
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">What the boss should see</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div className="rounded-xl border border-border bg-muted/15 p-4">
                <p className="font-semibold text-foreground">1. Registration speed</p>
                <p className="mt-1">
                  A user should register smoothly, disappear from the registration list,
                  and appear immediately in the shareholder record for AGM {activeYear}.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/15 p-4">
                <p className="font-semibold text-foreground">2. Year separation</p>
                <p className="mt-1">
                  Switching AGM years should clearly show whether that year has zero
                  activity or a real existing history.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/15 p-4">
                <p className="font-semibold text-foreground">3. Board confidence</p>
                <p className="mt-1">
                  The board screen, exported documents, and shareholder details should all
                  carry the same AGM year and the same event story.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-muted/15 p-4">
                <p className="font-semibold text-foreground">4. Audit confidence</p>
                <p className="mt-1">
                  Any rehearsal action should leave a visible audit trail so the event can
                  be defended operationally if needed.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
