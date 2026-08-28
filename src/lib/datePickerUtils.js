import { format, isValid, parseISO } from "date-fns";

export const DATE_PICKER_DISPLAY_FORMAT = "dd/MM/yyyy";

export function parsePickerDate(value) {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function formatPickerDate(date) {
  if (!date || !isValid(date)) return "";
  return format(date, "yyyy-MM-dd");
}
