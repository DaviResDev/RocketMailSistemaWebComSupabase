
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
        // Extract type from props
        const { type, ...restProps } = props;
        
        // Set a default value for the Toast
        let validType: "foreground" | "background" = "foreground";
        
        // Only try to use the provided type if it's one of the allowed values
        if (type === "foreground" || type === "background") {
          validType = type;
        }
        
        return (
          <Toast key={id} {...restProps} type={validType}>
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
