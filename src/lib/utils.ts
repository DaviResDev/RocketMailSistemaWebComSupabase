
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Add scrollbar hiding utility class
export const scrollbarHideClass = "scrollbar-hide";

// Helper to format from addresses correctly for email headers
export const formatFromAddress = (name: string | null | undefined, email: string): string => {
  return name ? `"${name}" <${email}>` : email;
};
