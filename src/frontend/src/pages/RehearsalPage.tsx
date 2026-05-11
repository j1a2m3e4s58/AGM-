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
  useSettings,
} from "@/hooks/use-backend";
import { filterRegistrationsByYear } from "@/lib/agm-year";
import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  FileBarChart2,
  PlayCircle,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { useMemo } from "react";

type ChecklistItem = {
  title: string;
  description: string;
  done: boolean;
  to: string;
  icon: typeof Upload;
};

export default function RehearsalPage() {
  const { activeYear } = useAgmYear();
  const { user } = useAuth();
  const { data: settings } = useSettings();
  const { data: shareholders = [] } = useAllShareholders();
  const { data: registrations = [] } = useAllRegistrations();

  const registrationsForYear = filterRegistrationsByYear(registrations, activeYear);

  const checklist = useMemo<ChecklistItem[]>(
    () => [
      {
        title: "AGM settings ready",
        description: "Confirm the AGM name, date, venue, and quorum setup are ready for rehearsal.",
        done: Boolean(settings?.agmName && settings?.venue),
        to: "/admin",
        icon: ShieldCheck,
      },
      {
        title: "Shareholder list loaded",
        description: "Make sure the shareholder register is available for AGM year testing.",
        done: shareholders.length > 0,
        to: "/import",
        icon: Upload,
      },
      {
        title: "Registration tested",
        description: "Register at least one person for AGM year rehearsal and confirm the record moves correctly.",
        done: registrationsForYear.length > 0,
        to: "/registration",
        icon: ClipboardCheck,
      },
      {
        title: "Shareholder record verified",
        description: "Open Shareholders and confirm details, proxy data, verification code, and PDF export.",
        done: registrationsForYear.length > 0,
        to: "/shareholders",
        icon: Users,
      },
      {
        title: "Reports exported",
        description: "Generate at least one annual report export and verify AGM year labels are correct.",
        done: registrationsForYear.length > 0,
        to: "/reports",
        icon: FileBarChart2,
      },
    ],
    [registrationsForYear.length, settings?.agmName, settings?.venue, shareholders.length],
  );

  const completedCount = checklist.filter((item) => item.done).length;

  return (
    <Layout>
      <div className="mx-auto max-w-5xl space-y-6" data-ocid="rehearsal.page">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Rehearsal Mode
            </p>
            <h1 className="font-display text-2xl font-bold text-foreground">
              AGM {activeYear} Guided Rehearsal
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Walk through the critical event-day flow before live use.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <AgmYearSwitcher compact />
            <Badge variant="outline" className="h-11 px-4 text-sm">
              {completedCount}/{checklist.length} steps ready
            </Badge>
          </div>
        </div>

        <Card className="border-primary/25 bg-primary/10">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Signed in as <span className="font-semibold text-foreground">{user?.username ?? "Operator"}</span>
              </p>
              <p className="mt-2 text-lg font-display font-semibold text-foreground">
                Use this screen to confirm the AGM year is fully ready before the live event starts.
              </p>
            </div>
            <Link to="/board">
              <Button className="min-h-[44px] gap-2">
                <PlayCircle className="h-4 w-4" />
                Open Board View
              </Button>
            </Link>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {checklist.map((item, index) => (
            <Card key={item.title}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-3 text-base">
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    Step {index + 1}: {item.title}
                  </span>
                  <Badge variant={item.done ? "default" : "secondary"}>
                    {item.done ? "Done" : "Pending"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <Link to={item.to}>
                  <Button variant="outline" className="min-h-[44px]">
                    Open Step
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
