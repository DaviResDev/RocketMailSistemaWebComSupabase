
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
        
        // Convert any type to a valid Toast type (foreground or background)
        let validType: "foreground" | "background" = "foreground";
        if (typeof type === "string" && (type === "foreground" || type === "background")) {
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
