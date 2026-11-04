import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { inputClass } from './inputStyles'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  children: ReactNode
}

/** A label above a form control, with an optional hint underneath. */
export function Field({ label, hint, required, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

/** Controls are full width unless a width class (e.g. "w-auto") is passed in. */
function controlClass(className?: string): string {
  return `${inputClass.replace('w-full ', '')} ${className ?? 'w-full'}`
}

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={controlClass(className)} {...rest} />
}

export function SelectInput({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={controlClass(className)} {...rest}>
      {children}
    </select>
  )
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} className={controlClass(className)} {...rest} />
}

export default Field
