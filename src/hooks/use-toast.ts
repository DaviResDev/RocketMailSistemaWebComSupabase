
import { toast as sonnerToast } from 'sonner'

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
  duration?: number
  action?: React.ReactNode
}

const toast = {
  info: (message: string, options?: any) => {
    return sonnerToast.info(message, options)
  },
  success: (message: string, options?: any) => {
    return sonnerToast.success(message, options)
  },
  error: (message: string, options?: any) => {
    return sonnerToast.error(message, options)
  },
  warning: (message: string, options?: any) => {
    return sonnerToast.warning(message, options)
  },
  loading: (message: string, options?: any) => {
    return sonnerToast.loading(message, options)
  }
}

const useToast = () => {
  const showToast = (props: ToastProps) => {
    const { title, description, variant, duration, action } = props
    
    if (variant === 'destructive') {
      sonnerToast.error(title, {
        description,
        duration,
        action
      })
      return
    }
    
    sonnerToast(title, {
      description,
      duration,
      action
    })
  }
  
  return {
    toast: showToast
  }
}

export { useToast, toast }
