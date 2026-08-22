import React from "react"
import { cn } from "../../lib/utils"
import { LucideIcon, Inbox } from "lucide-react"
import { motion, HTMLMotionProps } from "framer-motion"

export interface EmptyStateProps extends Omit<HTMLMotionProps<"div">, "title"> {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon = Inbox, title, description, action, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex flex-col items-center justify-center py-16 px-4 text-center",
          className
        )}
        {...props}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 mb-6">
          <Icon className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        {description && (
          <p className="text-slate-500 mb-8 max-w-sm mx-auto font-medium">
            {description}
          </p>
        )}
        {action && <div>{action}</div>}
      </motion.div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
