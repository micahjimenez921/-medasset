interface Option {
  value: string
  label: string
}

interface FilterChipsProps {
  options: Option[]
  value: string
  onChange: (value: string) => void
}

/** A row of pill buttons where exactly one is selected. */
export default function FilterChips({ options, value, onChange }: FilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
            value === o.value ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
