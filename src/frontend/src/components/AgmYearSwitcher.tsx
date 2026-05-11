import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAgmYear } from "@/context/AgmYearContext";

export function AgmYearSwitcher({
  title = "AGM Year",
  compact = false,
}: {
  title?: string;
  compact?: boolean;
}) {
  const { activeYear, setActiveYear, yearOptions } = useAgmYear();

  return (
    <div className={compact ? "min-w-[140px]" : "min-w-[180px]"}>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>
      <Select value={activeYear} onValueChange={setActiveYear}>
        <SelectTrigger data-ocid="agm_year.global_select">
          <SelectValue placeholder="Select AGM year" />
        </SelectTrigger>
        <SelectContent>
          {yearOptions.map((year) => (
            <SelectItem key={year} value={year}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
