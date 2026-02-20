// =============================================================================
// @repo/ui - The Shared Component Closet
// =============================================================================
//
// 🎭 ANALOGY: This is like a shared wardrobe in a theater production.
// All the actors (apps) can come here to borrow costumes (components)
// instead of each making their own from scratch!
//
// This package contains:
// - Custom components (Header, Counter)
// - Shadcn UI components (Button, Card)
// - Utility functions (cn for class merging)
// =============================================================================

// Custom Components
export { Header } from './components/Header'
export { Counter } from './components/Counter'

// Shadcn UI Components
export { Button, buttonVariants } from './components/ui/button'
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from './components/ui/card'
export { Toaster, toast } from './components/ui/toast'
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './components/ui/dialog'
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from './components/ui/table'
export { Input } from './components/ui/input'
export { Textarea } from './components/ui/textarea'
export { Label } from './components/ui/label'
export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from './components/ui/form'

// Utilities
export { cn } from './lib/utils'
