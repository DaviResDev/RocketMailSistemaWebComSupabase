
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
        
        // Certificar que temos uma string para comparação
        // e definir um tipo seguro para o componente Toast
        let toastType: "foreground" | "background" = "foreground";
        
        // Verificar se o tipo é "background" e atualizar apenas nesse caso
        if (typeof type === 'string' && type === "background") {
          toastType = "background";
        }
        
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
