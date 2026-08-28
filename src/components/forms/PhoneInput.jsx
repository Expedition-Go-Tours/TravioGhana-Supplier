import { forwardRef, useMemo } from 'react'
import PhoneInput from 'react-phone-number-input'
import { getCountryCallingCode, isValidPhoneNumber } from 'libphonenumber-js'
import 'react-phone-number-input/style.css'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'

const PhoneInputInput = forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full min-h-[46px] rounded-xl border bg-white px-3.5 py-2.5 text-sm transition-all focus-ring',
      props.disabled && 'bg-slate-50 text-slate-500 cursor-not-allowed',
      className
    )}
    {...props}
  />
))
PhoneInputInput.displayName = 'PhoneInputInput'

function CountrySelect({ value, onChange, options, name, disabled, ...rest }) {
  const safeOptions = options.filter((opt) => opt.value)

  return (
    <Select value={value || ''} onValueChange={(val) => onChange(val || undefined)} disabled={disabled}>
      <SelectTrigger
        name={name}
        aria-label="Country code"
        className={cn(
          'min-h-[46px] w-auto min-w-[100px] shrink-0 rounded-xl border border-slate-200 bg-white text-sm',
          disabled && 'bg-slate-50 text-slate-500 cursor-not-allowed'
        )}
        {...rest}
      >
        <SelectValue placeholder="Country" />
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-[320px] overflow-y-auto">
        {safeOptions.map((opt) => {
          let callingCode = ''
          try { callingCode = getCountryCallingCode(opt.value) } catch { /* invalid country code */ }
          return (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center justify-between w-full gap-3">
                <span>{opt.label}</span>
                {callingCode && <span className="text-slate-400 tabular-nums">+{callingCode}</span>}
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

const PhoneInputField = forwardRef(
  ({ value, onChange, error, defaultCountry = 'US', placeholder, className, disabled }, ref) => {
    const validationError = useMemo(() => {
      if (value && value.length > 3 && !isValidPhoneNumber(value)) {
        return 'Enter a valid mobile number for this country'
      }
      return ''
    }, [value])

    return (
      <div className="relative">
        <div
          className={cn(
            (error || validationError) && '[&_.PhoneInputInput]:border-red-300 [&_[data-slot=select-trigger]]:border-red-300'
          )}
        >
          <PhoneInput
            ref={ref}
            value={value || undefined}
            onChange={(newValue) => onChange(newValue || '')}
            defaultCountry={defaultCountry}
            disabled={disabled}
            placeholder={placeholder}
            countrySelectComponent={CountrySelect}
            inputComponent={PhoneInputInput}
            className={cn('flex items-center gap-2.5', className)}
            smartCaret
          />
        </div>
        {error && (
          <p className="text-[13px] text-red-500 mt-1.5">{error}</p>
        )}
        {validationError && !error && (
          <p className="text-[13px] text-red-500 mt-1.5">{validationError}</p>
        )}
      </div>
    )
  }
)

PhoneInputField.displayName = 'PhoneInputField'

export default PhoneInputField
