import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { GYG_LANGUAGES } from '@/constants/gygLists'

const LANGUAGES = GYG_LANGUAGES

export default function Step01Language() {
  const language = useProductBuilderStore((s) => s.language)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(1)

  return (
    <div className="max-w-[720px]">
      <label className="block text-sm font-semibold mb-2 text-slate-800">
        Choose the language for your product content
      </label>
      <Select value={language || ''} onValueChange={(v) => setField('language', v)}>
        <SelectTrigger data-field="language">
          <SelectValue placeholder="Select a language..." />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.language && <span className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.language[0]}</span>}
      <p className="text-[13px] text-slate-500 mt-1.5 leading-relaxed">
        All product content (title, descriptions, highlights) will be written in this language.
      </p>
    </div>
  )
}
