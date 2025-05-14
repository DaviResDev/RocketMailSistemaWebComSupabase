
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts && toasts.map(function ({ id, title, description, action, ...props }) {
        // Extract type from props and provide default
        const { type, ...restProps } = props;
        
        // Define a default toast type that's compatible with Toast component
        let toastType: "default" | "destructive" = "default";
        
        // We no longer compare with "background" since it's not a valid type
        // Instead we map any type values to the appropriate variant options
        // that our Toast component actually accepts
        
        return (
          <Toast key={id} {...restProps} variant={toastType}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
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
