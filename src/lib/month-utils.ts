const MONTH_I18N = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
});

export const MONTH_SELECT_LIMIT = 12;

export type MonthOption = {
  value: string;
  label: string;
};

export function startOfMonth(date: Date) {
  const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

export function endOfMonth(date: Date) {
  const normalized = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export function formatMonthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthLabel(date: Date) {
  const label = MONTH_I18N.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function parseMonthValue(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) {
    return null;
  }
  return startOfMonth(new Date(year, month - 1, 1));
}

export function getMonthRangeStrings(date: Date) {
  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

export function getQuarterRangeStrings(date: Date) {
  const endDate = endOfMonth(date);
  const startDate = startOfMonth(new Date(date));
  startDate.setMonth(startDate.getMonth() - 2);
  const normalizedStart = startOfMonth(startDate);
  return {
    startDate: normalizedStart.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

export function buildMonthOptions(selectedMonth: Date, limit = MONTH_SELECT_LIMIT): MonthOption[] {
  const options: MonthOption[] = [];
  const current = startOfMonth(new Date());

  for (let i = 0; i < limit; i++) {
    const optionDate = new Date(current);
    optionDate.setMonth(current.getMonth() - i);
    options.push({
      value: formatMonthValue(optionDate),
      label: formatMonthLabel(optionDate),
    });
  }

  const selectedValue = formatMonthValue(selectedMonth);
  if (!options.some((option) => option.value === selectedValue)) {
    options.push({
      value: selectedValue,
      label: formatMonthLabel(selectedMonth),
    });
  }

  return options.sort((a, b) => (a.value < b.value ? 1 : -1));
}

export function isWithinRange(
  dateString: string | null | undefined,
  start: Date,
  end: Date,
) {
  if (!dateString) return false;
  const value = new Date(dateString);
  return value >= start && value <= end;
}
