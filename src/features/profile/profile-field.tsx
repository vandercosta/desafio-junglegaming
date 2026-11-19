import type { ComponentProps } from 'react'

type Props = ComponentProps<'input'> & {
  id: string
  label: string
  message?: string
  suffix?: string
}

export default function ProfileField({
  id,
  label,
  message,
  suffix,
  ...input
}: Props) {
  return (
    <div className="grid min-w-0 content-start gap-1">
      <label htmlFor={id}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          {...input}
          id={id}
          aria-invalid={Boolean(message)}
          aria-describedby={
            [suffix && `${id}-suffix`, message && `${id}-error`]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="min-w-0 flex-1 rounded-md border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring"
        />
        {suffix && <span id={`${id}-suffix`}>{suffix}</span>}
      </div>
      {message && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}
