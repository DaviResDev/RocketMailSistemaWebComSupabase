
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
        // Extract type from props and convert it to a valid Toast type
        const { type, ...restProps } = props;
        // Default to 'foreground' if type isn't a valid Toast type
        const validType = (type === 'foreground' || type === 'background') ? 
          type : 'foreground';
        
        return (
          <Toast key={id} {...restProps} type={validType as "foreground" | "background"}>
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
