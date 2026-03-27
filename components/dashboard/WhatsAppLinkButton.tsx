import { MessageCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function WhatsAppLinkButton({
  href,
  label,
  className,
}: {
  href: string | null
  label: string
  className?: string
}) {
  if (!href) {
    return null
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => event.stopPropagation()}
      className={cn(
        buttonVariants({ variant: 'outline' }),
        'border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-100',
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </a>
  )
}
