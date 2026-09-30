import { cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";
import { FormLabel, Input, Select, Textarea } from "@/components/forms";

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
export function StaysField({ label, hint, wide = false, className, children }) {
  const id = useId();
  const control = isValidElement(children) ? cloneElement(children, { id }) : children;

  return (
    <div className={cn("space-y-2", wide && "col-span-full", className)}>
      {label && <FormLabel htmlFor={id}>{label}</FormLabel>}
      {control}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function StaysInput({ className, ...props }) {
  return <Input className={className} {...props} />;
}

export function StaysTextarea({ className, ...props }) {
  return <Textarea className={className} {...props} />;
}

export function StaysSelect({ className, options = [], children, ...props }) {
  return (
    <Select className={className} {...props}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      {children}
    </Select>
  );
}
