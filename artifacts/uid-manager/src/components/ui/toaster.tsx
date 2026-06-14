import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle2, AlertCircle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        // Assume variant is passed inside props, though typically it's typed. We cast to any for quick check or extract it.
        const variant = (props as any).variant;
        return (
          <Toast key={id} {...props}>
            <div className="flex gap-4 w-full items-start">
              <div className="flex-shrink-0 mt-0.5">
                {variant === "destructive" ? (
                  <AlertCircle className="h-6 w-6 text-red-400" />
                ) : variant === "success" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                )}
              </div>
              <div className="grid gap-1 flex-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
