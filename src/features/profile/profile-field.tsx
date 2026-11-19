import { cn } from 'cn'
import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

type Props = ComponentProps<'input'> & {
  id: string
  label: string
  message?: string
  suffix?: string
  collector?: boolean
}

export default function ProfileField({
  id,
  label,
  message,
  suffix,
  collector = false,
  type,
  ...input
}: Props) {
  const [visible, setVisible] = useState(false)
  const hasVisibilityControl = collector && type === 'password'
  const VisibilityIcon = visible ? Eye : EyeOff

  return (
    <div
      className={cn(
        'grid min-w-0 content-start gap-1',
        collector && 'gap-3 md:gap-4',
      )}
    >
      <label
        htmlFor={id}
        className={collector ? 'text-[15px]/[18px]' : undefined}
      >
        {label}
        {collector && input.required && type !== 'password' && (
          <span
            aria-hidden="true"
            className="ml-0.5 align-middle text-[22px]/[15px] text-[#f0805f]"
          >
            *
          </span>
        )}
      </label>
      <div className="relative flex items-center gap-2">
        {suffix && collector && (
          <span
            id={`${id}-suffix`}
            className="grid h-10 w-[78px] shrink-0 place-items-center rounded-[3px] border text-[15px]"
          >
            {suffix}
          </span>
        )}
        <input
          {...input}
          id={id}
          type={hasVisibilityControl && visible ? 'text' : type}
          aria-invalid={Boolean(message)}
          aria-describedby={
            [suffix && `${id}-suffix`, message && `${id}-error`]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className={cn(
            'min-w-0 flex-1 rounded-md border bg-background p-2 focus-visible:outline-2 focus-visible:outline-ring',
            collector &&
              'h-10 rounded-[3px] px-3 text-[15px] focus-visible:border-primary focus-visible:outline-none aria-invalid:border-destructive',
            hasVisibilityControl && 'pr-12',
          )}
        />
        {suffix && !collector && <span id={`${id}-suffix`}>{suffix}</span>}
        {hasVisibilityControl && (
          <button
            type="button"
            aria-controls={id}
            className="absolute inset-y-0 right-1 grid w-11 cursor-pointer place-items-center rounded-sm text-metadata-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => setVisible(!visible)}
          >
            <VisibilityIcon aria-hidden="true" className="size-[18px]" />
            <span className="sr-only">
              {visible ? 'Ocultar' : 'Mostrar'} {label.toLowerCase()}
            </span>
          </button>
        )}
      </div>
      {message && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  )
}
