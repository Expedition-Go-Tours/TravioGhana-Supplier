import { forwardRef } from "react";
import ReactDatePicker from "react-datepicker";
import { registerLocale } from "react-datepicker";
import { enGB } from "date-fns/locale";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DATE_PICKER_DISPLAY_FORMAT,
  formatPickerDate,
  parsePickerDate,
} from "@/lib/datePickerUtils";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("en-GB", enGB);

const DatePicker = forwardRef(function DatePicker(
  {
    value,
    onChange,
    minDate,
    maxDate,
    placeholder = "Select date",
    className,
    error = false,
    disabled = false,
    inline = false,
    size = "md",
    id,
    name,
    ...rest
  },
  ref,
) {
  const selected = parsePickerDate(value);
  const min = parsePickerDate(minDate);
  const max = parsePickerDate(maxDate);

  const handleChange = (date) => {
    onChange?.(date ? formatPickerDate(date) : "");
  };

  return (
    <div
      className={cn(
        "dashboard-date-picker",
        inline ? "dashboard-date-picker--inline" : "dashboard-date-picker--field",
        className,
      )}
    >
      <ReactDatePicker
        ref={ref}
        id={id}
        name={name}
        selected={selected}
        onChange={handleChange}
        minDate={min}
        maxDate={max}
        disabled={disabled}
        inline={inline}
        locale="en-GB"
        dateFormat={DATE_PICKER_DISPLAY_FORMAT}
        placeholderText={placeholder}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        calendarClassName="dashboard-date-picker__calendar"
        popperClassName="dashboard-date-picker__popper"
        className={cn(
          "dashboard-date-picker__input",
          size === "sm" && "dashboard-date-picker__input--sm",
          size === "md" && "dashboard-date-picker__input--md",
          error && "dashboard-date-picker__input--error",
        )}
        {...rest}
      />
      {!inline && (
        <Calendar
          size={16}
          className="dashboard-date-picker__icon cursor-pointer text-[#9e9e9e]"
          aria-hidden="true"
        />
      )}
    </div>
  );
});

DatePicker.displayName = "DatePicker";

export default DatePicker;
