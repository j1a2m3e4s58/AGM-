import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useAllCheckIns,
  useAllRegistrations,
  useAllShareholders,
  useDashboardMetrics,
  useSettings,
  RegistrationType,
} from "@/hooks/use-backend";
import type {
  AGMSettings,
  CheckIn,
  DashboardMetrics,
  Registration,
  Shareholder,
} from "@/types";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  MapPin,
  QrCode,
  Search,
  TrendingUp,
  Upload,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(nanoTs: bigint): string {
  const ms = Number(nanoTs / BigInt(1_000_000));
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ms).toLocaleDateString();
}

function exportSnapshotCSV(
  metrics: DashboardMetrics,
  settings: AGMSettings | undefined,
) {
  const rows = [
    ["Metric", "Value"],
    ["AGM Name", settings?.agmName ?? ""],
    ["AGM Date", settings?.agmDate ?? ""],
    ["Venue", settings?.venue ?? ""],
    ["Total Shareholders", metrics.totalShareholders.toString()],
    ["Registered", metrics.registered.toString()],
    ["Registered In-Person", metrics.registeredInPerson.toString()],
    ["Registered Proxy", metrics.registeredProxy.toString()],
    ["Checked In", metrics.checkedIn.toString()],
    ["Not Registered", metrics.notRegistered.toString()],
    ["Attendance Rate (%)", (metrics.attendanceRate * 100).toFixed(1)],
    ["Quorum Reached", metrics.quorumStatus ? "Yes" : "No"],
    [
      "Required Quorum (%)",
      settings ? settings.quorumThreshold.toString() : "",
    ],
    ["Snapshot Taken", new Date().toISOString()],
  ];
  const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agm-snapshot-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type AttendeeRecord = {
  id: string;
  attendeeName: string;
  attendeeType: "In Person" | "Proxy";
  shareholderName: string;
  shareholderNumber: string;
  contact: string;
  verificationCode: string;
  registeredAt: bigint;
  status: "Registered";
};

function formatTimestamp(value: bigint): string {
  return new Date(Number(value) / 1_000_000).toLocaleString();
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadXlsx(
  filename: string,
  headers: string[],
  rows: string[][],
) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Attendees");
  XLSX.writeFile(workbook, filename);
}

async function downloadPdf(
  filename: string,
  title: string,
  headers: string[],
  rows: string[][],
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { jsPDF } = await import("jspdf" as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { default: autoTable } = await import("jspdf-autotable" as any);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [22, 101, 52], textColor: 255 },
  });
  doc.save(filename);
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({
  segments,
  total,
}: { segments: DonutSegment[]; total: number }) {
  const R = 56;
  const stroke = 14;
  const cx = 68;
  const cy = 68;
  const circumference = 2 * Math.PI * R;

  let offset = 0;
  const slices = segments.map((seg) => {
    const frac = total > 0 ? seg.value / total : 0;
    const dash = frac * circumference;
    const gap = circumference - dash;
    const startOffset = offset;
    offset += dash;
    return { ...seg, dash, gap, startOffset };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <svg
        width="136"
        height="136"
        className="flex-shrink-0"
        aria-hidden="true"
      >
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-muted/40"
        />
        {slices.map((s) => (
          <circle
            key={s.label}
            cx={cx}
            cy={cy}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={stroke}
            strokeDasharray={`${s.dash} ${s.gap}`}
            strokeDashoffset={-s.startOffset + circumference / 4}
            className="transition-smooth"
          />
        ))}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-foreground"
          style={{
            fontSize: 22,
            fontWeight: 700,
            fontFamily: "var(--font-display)",
          }}
        >
          {total.toLocaleString()}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ fontSize: 11 }}
        >
          Total
        </text>
      </svg>
      <div className="flex flex-col gap-2">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: s.color }}
            />
            <span className="text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-semibold text-foreground tabular-nums pl-3">
              {s.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stats3DChart({
  segments,
  total,
}: { segments: DonutSegment[]; total: number }) {
  const maxValue = Math.max(...segments.map((segment) => segment.value), 1);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 overflow-x-auto pb-2">
        {segments.map((segment, index) => {
          const height = Math.max(24, (segment.value / maxValue) * 180);
          return (
            <div
              key={segment.label}
              className="chart-rise min-w-[72px] flex flex-col items-center gap-3"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="text-center">
                <p className="text-lg font-display font-bold text-foreground tabular-nums">
                  {segment.value.toLocaleString()}
                </p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {segment.label}
                </p>
              </div>
              <div className="relative flex h-[210px] items-end">
                <div className="relative w-14" style={{ height }}>
                  <div
                    className="absolute inset-0 border border-white/10 shadow-[0_20px_40px_rgba(4,16,32,0.3)]"
                    style={{
                      background: `linear-gradient(180deg, ${segment.color} 0%, color-mix(in oklab, ${segment.color} 68%, black 32%) 100%)`,
                      transform: "perspective(240px) rotateX(10deg)",
                      transformOrigin: "bottom center",
                    }}
                  />
                  <div
                    className="absolute -top-2 left-0 right-0 h-4 border border-white/15"
                    style={{
                      background: `linear-gradient(180deg, color-mix(in oklab, ${segment.color} 85%, white 15%) 0%, ${segment.color} 100%)`,
                      transform: "skewX(-45deg)",
                    }}
                  />
                  <div
                    className="absolute top-0 -right-2 h-full w-4 border border-white/10"
                    style={{
                      background: `linear-gradient(180deg, color-mix(in oklab, ${segment.color} 62%, black 38%) 0%, color-mix(in oklab, ${segment.color} 45%, black 55%) 100%)`,
                      transform: "skewY(-45deg)",
                      transformOrigin: "left top",
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Shareholders
            </p>
            <p className="text-2xl font-display font-bold text-foreground">
              {total.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Leading Category
            </p>
            <p className="text-sm font-semibold text-foreground">
              {[...segments].sort((a, b) => b.value - a.value)[0]?.label ?? "N/A"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Metric Card ─────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  valueColor = "text-foreground",
  loading,
  ocid,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  valueColor?: string;
  loading?: boolean;
  ocid: string;
}) {
  return (
    <Card className="border-border/60" data-ocid={ocid}>
      <CardContent className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-7 w-16 mt-1" />
          ) : (
            <p
              className={`text-2xl font-display font-bold tabular-nums ${valueColor}`}
            >
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Quick Action Button ──────────────────────────────────────────────────────

function QuickAction({
  to,
  icon: Icon,
  label,
  ocid,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  ocid: string;
}) {
  return (
    <Link
      to={to}
      data-ocid={ocid}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-smooth group min-h-[80px] justify-center"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-smooth">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground text-center leading-tight">
        {label}
      </span>
    </Link>
  );
}

// ─── Activity Item ────────────────────────────────────────────────────────────

function ActivityItem({ checkIn, index }: { checkIn: CheckIn; index: number }) {
  return (
    <div
      data-ocid={`dashboard.activity.item.${index}`}
      className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0"
    >
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
        <UserCheck className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          Shareholder checked in
        </p>
        <p className="text-xs text-muted-foreground">
          ID: {checkIn.shareholderId.slice(0, 8)}… via{" "}
          {checkIn.method
            .replace("ManualQuick", "Quick")
            .replace("QRScan", "QR Scan")}
        </p>
      </div>
      <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {timeAgo(checkIn.checkedInAt)}
      </span>
    </div>
  );
}

function AttendeesPanel({
  shareholders,
  registrations,
}: {
  shareholders: Shareholder[];
  registrations: Registration[];
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "in-person" | "proxy">(
    "all",
  );
  const [sortBy, setSortBy] = useState<
    "latest" | "name" | "shareholder" | "type"
  >("latest");

  const attendeeRecords = useMemo<AttendeeRecord[]>(() => {
    const shareholderMap = new Map(shareholders.map((item) => [item.id, item]));
    return registrations
      .map((registration) => {
        const shareholder = shareholderMap.get(registration.shareholderId);
        if (!shareholder) return null;
        const isProxy = registration.registrationType === RegistrationType.Proxy;
        return {
          id: registration.id,
          attendeeName: isProxy
            ? (registration.proxyName ?? "Proxy Representative")
            : shareholder.fullName,
          attendeeType: isProxy ? "Proxy" : "In Person",
          shareholderName: shareholder.fullName,
          shareholderNumber: shareholder.shareholderNumber,
          contact: isProxy
            ? (registration.proxyContact ?? "—")
            : (shareholder.phone ?? shareholder.email ?? "—"),
          verificationCode: registration.verificationCode,
          registeredAt: registration.registeredAt,
          status: "Registered",
        } satisfies AttendeeRecord;
      })
      .filter((item): item is AttendeeRecord => item !== null);
  }, [registrations, shareholders]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const nextRecords = attendeeRecords.filter((item) => {
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "in-person" && item.attendeeType === "In Person") ||
        (typeFilter === "proxy" && item.attendeeType === "Proxy");
      const matchesSearch =
        !normalizedSearch ||
        item.attendeeName.toLowerCase().includes(normalizedSearch) ||
        item.shareholderName.toLowerCase().includes(normalizedSearch) ||
        item.shareholderNumber.toLowerCase().includes(normalizedSearch) ||
        item.contact.toLowerCase().includes(normalizedSearch) ||
        item.verificationCode.toLowerCase().includes(normalizedSearch);
      return matchesType && matchesSearch;
    });

    return [...nextRecords].sort((left, right) => {
      switch (sortBy) {
        case "name":
          return left.attendeeName.localeCompare(right.attendeeName);
        case "shareholder":
          return left.shareholderName.localeCompare(right.shareholderName);
        case "type":
          return left.attendeeType.localeCompare(right.attendeeType);
        case "latest":
        default:
          return Number(right.registeredAt - left.registeredAt);
      }
    });
  }, [attendeeRecords, search, sortBy, typeFilter]);

  const stats = useMemo(() => {
    const total = attendeeRecords.length;
    const proxies = attendeeRecords.filter(
      (item) => item.attendeeType === "Proxy",
    ).length;
    const inPerson = attendeeRecords.filter(
      (item) => item.attendeeType === "In Person",
    ).length;
    return {
      total,
      proxies,
      inPerson,
      pending: Math.max(shareholders.length - total, 0),
    };
  }, [attendeeRecords, shareholders.length]);

  const exportHeaders = [
    "Attendee Name",
    "Attendee Type",
    "Shareholder Name",
    "Shareholder Number",
    "Contact",
    "Verification Code",
    "Registered At",
    "Status",
  ];

  const exportRows = filteredRecords.map((item) => [
    item.attendeeName,
    item.attendeeType,
    item.shareholderName,
    item.shareholderNumber,
    item.contact,
    item.verificationCode,
    formatTimestamp(item.registeredAt),
    item.status,
  ]);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Registered Attendees
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Total Attendees"
            value={stats.total.toLocaleString()}
            icon={Users}
            ocid="dashboard.attendees.total"
          />
          <MetricCard
            label="In Person"
            value={stats.inPerson.toLocaleString()}
            icon={UserCheck}
            valueColor="text-primary"
            ocid="dashboard.attendees.in_person"
          />
          <MetricCard
            label="Proxies"
            value={stats.proxies.toLocaleString()}
            icon={ClipboardList}
            valueColor="text-primary"
            ocid="dashboard.attendees.proxies"
          />
          <MetricCard
            label="Pending"
            value={stats.pending.toLocaleString()}
            icon={UserX}
            valueColor="text-accent"
            ocid="dashboard.attendees.pending"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search attendee, shareholder, phone, or code"
              className="pl-9 min-h-[44px]"
              data-ocid="dashboard.attendees.search_input"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(value as "all" | "in-person" | "proxy")
            }
          >
            <SelectTrigger
              className="w-full min-h-[44px]"
              data-ocid="dashboard.attendees.filter_select"
            >
              <SelectValue placeholder="Filter type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All attendees</SelectItem>
              <SelectItem value="in-person">In person</SelectItem>
              <SelectItem value="proxy">Proxy</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sortBy}
            onValueChange={(value) =>
              setSortBy(value as "latest" | "name" | "shareholder" | "type")
            }
          >
            <SelectTrigger
              className="w-full min-h-[44px]"
              data-ocid="dashboard.attendees.sort_select"
            >
              <SelectValue placeholder="Sort records" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="latest">Latest first</SelectItem>
              <SelectItem value="name">Attendee name</SelectItem>
              <SelectItem value="shareholder">Shareholder name</SelectItem>
              <SelectItem value="type">Attendee type</SelectItem>
            </SelectContent>
          </Select>
          <Tabs defaultValue="csv" className="gap-0 sm:col-span-2 lg:col-span-1">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto">
              <TabsTrigger
                value="csv"
                onClick={() =>
                  downloadCsv(
                    `dashboard-attendees-${Date.now()}.csv`,
                    exportHeaders,
                    exportRows,
                  )
                }
                data-ocid="dashboard.attendees.export_csv"
              >
                <FileText className="w-4 h-4" />
                CSV
              </TabsTrigger>
              <TabsTrigger
                value="xlsx"
                onClick={() =>
                  void downloadXlsx(
                    `dashboard-attendees-${Date.now()}.xlsx`,
                    exportHeaders,
                    exportRows,
                  )
                }
                data-ocid="dashboard.attendees.export_xlsx"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </TabsTrigger>
              <TabsTrigger
                value="pdf"
                onClick={() =>
                  void downloadPdf(
                    `dashboard-attendees-${Date.now()}.pdf`,
                    "Registered Attendees",
                    exportHeaders,
                    exportRows,
                  )
                }
                data-ocid="dashboard.attendees.export_pdf"
              >
                <Download className="w-4 h-4" />
                PDF
              </TabsTrigger>
            </TabsList>
            <TabsContent value="csv" className="hidden" />
            <TabsContent value="xlsx" className="hidden" />
            <TabsContent value="pdf" className="hidden" />
          </Tabs>
        </div>

        <div className="md:hidden space-y-3">
          {filteredRecords.length === 0 ? (
            <div
              className="rounded-xl border border-border px-4 py-10 text-center text-sm text-muted-foreground"
              data-ocid="dashboard.attendees.empty_state"
            >
              No registered attendees match the current search or filters.
            </div>
          ) : (
            filteredRecords.map((item, index) => (
              <div
                key={item.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
                data-ocid={`dashboard.attendees.item.${index + 1}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">
                      {item.attendeeName}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.shareholderName} · #{item.shareholderNumber}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {item.attendeeType}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Contact
                    </p>
                    <p className="text-foreground break-words">{item.contact}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Verification Code
                    </p>
                    <p className="font-mono text-xs text-primary break-all">
                      {item.verificationCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Registered At
                    </p>
                    <p className="text-muted-foreground">
                      {formatTimestamp(item.registeredAt)}
                    </p>
                  </div>
                </div>
                <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs">
                  {item.status}
                </Badge>
              </div>
            ))
          )}
        </div>

        <div className="hidden md:block rounded-xl border border-border overflow-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Attendee
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Type
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Shareholder
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Contact
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Verification Code
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Registered At
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                    data-ocid="dashboard.attendees.empty_state"
                  >
                    No registered attendees match the current search or filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item, index) => (
                  <tr
                    key={item.id}
                    className="border-t border-border/50 hover:bg-muted/20 transition-colors"
                    data-ocid={`dashboard.attendees.item.${index + 1}`}
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">
                        {item.attendeeName}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className="text-xs">
                        {item.attendeeType}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">
                        {item.shareholderName}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        #{item.shareholderNumber}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {item.contact}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-primary">
                      {item.verificationCode}
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {formatTimestamp(item.registeredAt)}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className="bg-primary/15 text-primary border border-primary/30 text-xs">
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const quorumThreshold = settings?.quorumThreshold ?? BigInt(0);

  const { data: metrics, isLoading: metricsLoading } =
    useDashboardMetrics(quorumThreshold);

  // Override refetchInterval for checkins to 5s
  const { data: checkIns } = useAllCheckIns();
  const { data: shareholders = [] } = useAllShareholders();
  const { data: registrations = [] } = useAllRegistrations();

  const recentActivity = useMemo(() => {
    if (!checkIns) return [];
    return [...checkIns]
      .sort((a, b) => Number(b.checkedInAt - a.checkedInAt))
      .slice(0, 10);
  }, [checkIns]);

  const attendanceRate = useMemo(() => {
    if (!metrics) return 0;
    return metrics.attendanceRate * 100;
  }, [metrics]);

  const quorumPct = useMemo(() => {
    return settings ? Number(settings.quorumThreshold) : 50;
  }, [settings]);

  const donutSegments: DonutSegment[] = useMemo(
    () => [
      {
        label: "Not Registered",
        value: metrics ? Number(metrics.notRegistered) : 0,
        color: "oklch(0.58 0.01 155)",
      },
      {
        label: "In Person",
        value: metrics ? Number(metrics.registeredInPerson) : 0,
        color: "oklch(0.68 0.22 155)",
      },
      {
        label: "Proxy",
        value: metrics ? Number(metrics.registeredProxy) : 0,
        color: "oklch(0.72 0.14 85)",
      },
      {
        label: "Checked In",
        value: metrics ? Number(metrics.checkedIn) : 0,
        color: "oklch(0.72 0.15 25)",
      },
    ],
    [metrics],
  );

  const handleExport = useCallback(() => {
    if (metrics) exportSnapshotCSV(metrics, settings);
  }, [metrics, settings]);

  const loading = metricsLoading || settingsLoading;

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto" data-ocid="dashboard.page">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live attendance metrics & analytics
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={!metrics}
            data-ocid="dashboard.export_button"
            className="gap-2 min-h-[44px] w-full sm:w-auto"
          >
            <Download className="w-4 h-4" />
            Export Snapshot
          </Button>
        </div>

        {/* Quorum Banner */}
        <QuorumBanner
          metrics={metrics}
          quorumPct={quorumPct}
          attendanceRate={attendanceRate}
          loading={loading}
        />

        {/* Metric Cards */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
          data-ocid="dashboard.metrics.section"
        >
          <MetricCard
            label="Total Shareholders"
            value={
              metrics ? Number(metrics.totalShareholders).toLocaleString() : "—"
            }
            icon={Users}
            loading={loading}
            ocid="dashboard.metric.total"
          />
          <MetricCard
            label="Registered"
            value={metrics ? Number(metrics.registered).toLocaleString() : "—"}
            icon={ClipboardList}
            valueColor="text-primary"
            loading={loading}
            ocid="dashboard.metric.registered"
          />
          <MetricCard
            label="Checked In"
            value={metrics ? Number(metrics.checkedIn).toLocaleString() : "—"}
            icon={CheckCircle2}
            valueColor="text-primary"
            loading={loading}
            ocid="dashboard.metric.checkedin"
          />
          <MetricCard
            label="Pending"
            value={
              metrics ? Number(metrics.notRegistered).toLocaleString() : "—"
            }
            icon={UserX}
            valueColor="text-accent"
            loading={loading}
            ocid="dashboard.metric.pending"
          />
        </div>

        {/* Charts + AGM Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut chart */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Attendance Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {loading ? (
                <div className="flex items-center gap-6">
                  <Skeleton className="w-[136px] h-[136px] rounded-full flex-shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-4 w-full" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <Stats3DChart
                    segments={donutSegments}
                    total={metrics ? Number(metrics.totalShareholders) : 0}
                  />
                  <DonutChart
                    segments={donutSegments}
                    total={metrics ? Number(metrics.totalShareholders) : 0}
                  />
                </div>
              )}

              {/* Attendance rate bar */}
              {!loading && metrics && (
                <div className="mt-6 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Attendance Rate</span>
                    <span className="font-semibold text-foreground">
                      {attendanceRate.toFixed(1)}%
                    </span>
                  </div>
                  <div
                    className="h-2.5 rounded-full bg-muted overflow-hidden"
                    data-ocid="dashboard.attendance_bar"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-smooth"
                      style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AGM Info Card */}
          <AGMInfoCard settings={settings} loading={settingsLoading} />
        </div>

        {/* Recent Activity + Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Activity Feed */}
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Recent Activity
                <Badge variant="secondary" className="ml-auto text-xs">
                  Auto-refreshes
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent data-ocid="dashboard.activity.list">
              {!checkIns || checkIns.length === 0 ? (
                <div
                  data-ocid="dashboard.activity.empty_state"
                  className="flex flex-col items-center justify-center py-8 text-center gap-2"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No check-ins yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Activity will appear here once shareholders check in
                  </p>
                </div>
              ) : (
                <div>
                  {recentActivity.map((ci, i) => (
                    <ActivityItem key={ci.id} checkIn={ci} index={i + 1} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="grid grid-cols-2 gap-2"
                data-ocid="dashboard.quick_actions.section"
              >
                <QuickAction
                  to="/registration"
                  icon={UserPlus}
                  label="Register Shareholder"
                  ocid="dashboard.register.button"
                />
                <QuickAction
                  to="/checkin"
                  icon={QrCode}
                  label="Quick Check-In"
                  ocid="dashboard.checkin.button"
                />
                <QuickAction
                  to="/import"
                  icon={Upload}
                  label="Import Shareholders"
                  ocid="dashboard.import.button"
                />
                <QuickAction
                  to="/reports"
                  icon={FileBarChart2}
                  label="View Reports"
                  ocid="dashboard.reports.button"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <AttendeesPanel
          shareholders={shareholders}
          registrations={registrations}
        />
      </div>
    </Layout>
  );
}

// ─── Quorum Banner ────────────────────────────────────────────────────────────

function QuorumBanner({
  metrics,
  quorumPct,
  attendanceRate,
  loading,
}: {
  metrics: DashboardMetrics | undefined;
  quorumPct: number;
  attendanceRate: number;
  loading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-16 w-full" />;
  }

  const reached = metrics?.quorumStatus ?? false;

  return (
    <div
      data-ocid="dashboard.quorum.banner"
      className="sea-shell sea-outline surface-highlight border border-border/60 px-5 py-3.5 flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <div
        className={`w-10 h-10 flex items-center justify-center flex-shrink-0 border ${
          reached
            ? "bg-primary/12 border-primary/30"
            : "bg-muted/50 border-border/70"
        }`}
      >
        {reached ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-primary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`font-display font-bold text-base ${
            reached ? "text-primary" : "text-foreground"
          }`}
        >
          Quorum Status: {reached ? "✓ REACHED" : "NOT YET REACHED"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Attendance:{" "}
          <span className="font-semibold text-foreground">
            {attendanceRate.toFixed(1)}%
          </span>{" "}
          &nbsp;·&nbsp; Required:{" "}
          <span className="font-semibold text-foreground">{quorumPct}%</span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="h-2 w-36 bg-muted overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(attendanceRate, 100)}%` }}
            />
          </div>
        <p className="text-xs text-muted-foreground">
          Threshold at {quorumPct}%
        </p>
      </div>
    </div>
  );
}

// ─── AGM Info Card ────────────────────────────────────────────────────────────

function AGMInfoCard({
  settings,
  loading,
}: {
  settings: AGMSettings | undefined;
  loading: boolean;
}) {
  return (
    <Card className="border-border/60" data-ocid="dashboard.agm_info.card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          AGM Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : !settings || !settings.agmName ? (
          <div
            data-ocid="dashboard.agm_info.empty_state"
            className="flex flex-col items-center text-center py-6 gap-2"
          >
            <AlertTriangle className="w-8 h-8 text-accent" />
            <p className="text-sm font-medium text-foreground">
              AGM not configured
            </p>
            <p className="text-xs text-muted-foreground">
              Go to Admin settings to configure AGM details
            </p>
            <Link
              to="/admin"
              data-ocid="dashboard.agm_info.configure_link"
              className="mt-2 text-xs text-primary hover:underline font-medium"
            >
              Configure now →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                AGM Name
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5 leading-tight">
                {settings.agmName}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm text-foreground font-medium">
                  {settings.agmDate || "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Venue</p>
                <p className="text-sm text-foreground font-medium">
                  {settings.venue || "Not set"}
                </p>
              </div>
            </div>
            <div className="pt-2 border-t border-border/40">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Quorum Threshold
                </p>
                <Badge variant="outline" className="text-xs">
                  {settings.quorumThreshold.toString()}%
                </Badge>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
