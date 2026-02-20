import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Form layout components — lightweight wrappers for building forms.
 *
 * Usage:
 *   <Form onSubmit={handleSubmit}>
 *     <FormItem>
 *       <FormLabel htmlFor="email">Email</FormLabel>
 *       <FormControl>
 *         <Input id="email" type="email" />
 *       </FormControl>
 *       <FormDescription>We'll never share your email.</FormDescription>
 *       <FormMessage>{errors.email}</FormMessage>
 *     </FormItem>
 *   </Form>
 */

const Form = React.forwardRef<HTMLFormElement, React.FormHTMLAttributes<HTMLFormElement>>(
  ({ className, ...props }, ref) => (
    <form ref={ref} className={cn('space-y-6', className)} {...props} />
  )
)
Form.displayName = 'Form'

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('space-y-2', className)} {...props} />
  )
)
FormItem.displayName = 'FormItem'

const FormLabel = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
)
FormLabel.displayName = 'FormLabel'

const FormControl = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ ...props }, ref) => <div ref={ref} {...props} />
)
FormControl.displayName = 'FormControl'

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-[0.8rem] text-muted-foreground', className)} {...props} />
))
FormDescription.displayName = 'FormDescription'

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  if (!children) return null
  return (
    <p ref={ref} className={cn('text-[0.8rem] font-medium text-destructive', className)} {...props}>
      {children}
    </p>
  )
})
FormMessage.displayName = 'FormMessage'

export { Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage }
