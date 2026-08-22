import React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl"
  text?: string
}

export function Spinner({ size = "md", text, className, ...props }: SpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)} {...props}>
      <Loader2 
        className={cn("animate-spin text-teal-600", {
          "h-4 w-4": size === "sm",
          "h-6 w-6": size === "md",
          "h-10 w-10": size === "lg",
          "h-12 w-12": size === "xl",
        })} 
      />
      {text && <p className="text-sm font-medium text-slate-500">{text}</p>}
    </div>
  )
}
