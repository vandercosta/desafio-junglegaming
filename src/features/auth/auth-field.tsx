import { Eye, EyeOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

type AuthFieldProps = ComponentProps<'input'> & {
  id: string
  label: string
}

export default function AuthField({
  id,
  label,
  type,
  className = '',
  ...props
}: AuthFieldProps) {
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const VisibilityIcon = visible ? Eye : EyeOff

  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type={isPassword && visible ? 'text' : type}
        className={`h-[50px] w-full rounded-[10px] border bg-transparent px-4 text-sm/4 placeholder:text-metadata-foreground focus:border-primary focus:outline-none aria-invalid:border-destructive lg:h-10 lg:rounded-[5px] ${isPassword ? 'pr-12' : ''} ${className}`}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          aria-controls={id}
          className="absolute inset-y-0 right-1 grid w-10 cursor-pointer place-items-center rounded-md text-metadata-foreground hover:text-text-accent focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setVisible(!visible)}
        >
          <VisibilityIcon aria-hidden="true" className="size-[18px]" />
          <span className="sr-only">
            {visible ? 'Ocultar' : 'Mostrar'} {label.toLowerCase()}
          </span>
        </button>
      )}
    </div>
  )
}
