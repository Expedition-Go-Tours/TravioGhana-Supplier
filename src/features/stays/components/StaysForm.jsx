import { cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";
import { FormLabel, Input, Textarea } from "@/components/forms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Stays form controls — thin wrappers over the portal's shared form kit
 * (`components/forms`), so the fields are the same component the rest of the
 * dashboard uses and can never drift apart.
 *
 * `StaysField` mirrors `FormField` and additionally wires the label to its
 * control (`htmlFor`/`id`), which the shared label does not do on its own —
 * without it, clicking the label does not focus the field and screen readers
 * announce the input as unlabelled.
 */
export function StaysField({ label, hint, error, wide = false, className, children }) {
  const id = useId();
  const control = isValidElement(children) ? cloneElement(children, { id }) : children;

  return (
    <div className={cn("space-y-2", wide && "col-span-full", className)}>
      {label && <FormLabel htmlFor={id}>{label}</FormLabel>}
      {control}
      {error ? (
        <p className="text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function StaysInput({ className, ...props }) {
  return <Input className={className} {...props} />;
}

export function StaysTextarea({ className, ...props }) {
  return <Textarea className={className} {...props} />;
}

/** Options are bare strings or `{ value, label }` pairs. */
function normalizeOption(option) {
  if (option && typeof option === "object") return option;
  return { value: String(option), label: String(option) };
}

/**
 * The workspace dropdown — the same custom Radix select the Experience product
 * builder uses (`components/ui/select`), not a native `<select>`. The open
 * menu, check indicator, keyboard behaviour and styling therefore match the
 * product builder.
 *
 * The API stays native-select-shaped for existing call sites: pass `options`
 * and an `onChange` that reads `event.target.value`. Radix's
 * `onValueChange(value)` is adapted to that event shape here, so no caller
 * needs to change. `className` styles the trigger and the field `id` is
 * forwarded to it so `StaysField` labels keep working.
 */
export function StaysSelect({
  className,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  name,
  required = false,
  ...props
}) {
  return (
    <Select
      value={value == null ? "" : String(value)}
      onValueChange={(next) => onChange?.({ target: { value: next } })}
      disabled={disabled}
      name={name}
      required={required}
    >
      <SelectTrigger className={className} {...props}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      {/* Above StaysModal (z-50) and the builder's fixed overlay (z-50). */}
      <SelectContent className="z-[60]">
        {options.map((option, index) => {
          const { value: optionValue, label } = normalizeOption(option);
          return (
            <SelectItem key={`${optionValue}-${index}`} value={optionValue}>
              {label}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
