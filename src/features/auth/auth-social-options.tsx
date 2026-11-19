import facebookLogo from '@/assets/icons/facebook-logo.svg'
import googleLogo from '@/assets/icons/google-logo.svg'

const providers = [
  { name: 'Google', logo: googleLogo },
  { name: 'Facebook', logo: facebookLogo },
]

export default function AuthSocialOptions({
  onSelect,
}: {
  onSelect: (provider: string) => void
}) {
  return (
    <div className="mt-[clamp(1.5rem,calc(24dvh-11rem),2.5rem)] lg:mt-6">
      <p className="flex items-center gap-3 text-center text-[13px]/4 before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
        Ou continue com
      </p>
      <div className="mx-auto mt-3 grid max-w-[358px] gap-4 lg:max-w-[340px] lg:gap-3">
        {providers.map(({ name, logo }) => (
          <button
            key={name}
            type="button"
            className="flex h-10 cursor-pointer items-center justify-center gap-3 rounded-[5px] border text-[13px]/4 font-medium text-muted-foreground hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
            onClick={() => onSelect(name)}
          >
            <img src={logo} alt="" width={20} height={20} />
            Continuar com {name}
          </button>
        ))}
      </div>
    </div>
  )
}
