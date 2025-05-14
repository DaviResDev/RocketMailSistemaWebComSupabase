
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
        
        // Check if type is a string and matches expected values
        const typeString = typeof type === 'string' ? type : 'foreground';
        
        // Use a properly typed variable
        const toastType = typeString === 'background' ? 'background' : 'foreground';
        
        return (
          <Toast key={id} {...restProps} type={toastType}>
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
