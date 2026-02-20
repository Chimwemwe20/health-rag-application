'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Toaster — drop this once in your layout root (e.g. layout.tsx or _app.tsx).
 *
 * Usage:
 *   import { toast } from "sonner"
 *   toast("Event created!")
 *   toast.success("Saved successfully")
 *   toast.error("Something went wrong")
 *   toast.warning("Check your input")
 *   toast.info("New update available")
 *   toast.promise(myPromise, { loading: "Saving…", success: "Done!", error: "Failed" })
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
export { toast } from 'sonner'
