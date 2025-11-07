import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthOption } from "@/lib/month-utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MonthPaginationControlsProps = {
  selectedValue: string;
  options: MonthOption[];
  onPrevious: () => void;
  onNext: () => void;
  onSelect: (value: string) => void;
  disableNext?: boolean;
  className?: string;
};

export function MonthPaginationControls({
  selectedValue,
  options,
  onPrevious,
  onNext,
  onSelect,
  disableNext = false,
  className = "",
}: MonthPaginationControlsProps) {
  return (
    <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrevious}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={disableNext}
          onClick={onNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <Select value={selectedValue} onValueChange={onSelect}>
        <SelectTrigger className="w-full sm:w-[220px]">
          <SelectValue placeholder="Selecciona un mes" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
