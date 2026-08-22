import React from "react"
import { PlayCircle, CheckCircle2, Lock } from "lucide-react"
import { cn } from "../../lib/utils"

export interface LessonItemProps {
  id: number | string
  title: string
  duration?: string
  isCompleted?: boolean
  isLocked?: boolean
  isActive?: boolean
  onClick?: () => void
  className?: string
}

export function LessonItem({
  title,
  duration,
  isCompleted = false,
  isLocked = false,
  isActive = false,
  onClick,
  className,
}: LessonItemProps) {
  return (
    <div
      onClick={!isLocked ? onClick : undefined}
      className={cn(
        "group flex items-center justify-between rounded-xl border p-4 transition-all duration-200",
        {
          "cursor-pointer bg-white border-slate-100 hover:border-teal-500 hover:shadow-sm":
            !isLocked && !isActive,
          "border-teal-500 bg-teal-50": isActive,
          "cursor-not-allowed bg-slate-50 border-slate-100 opacity-75": isLocked,
        },
        className
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors",
            {
              "bg-teal-100 text-teal-600": isCompleted,
              "bg-teal-600 text-white shadow-sm": isActive,
              "bg-slate-100 text-slate-400 group-hover:bg-teal-50 group-hover:text-teal-500":
                !isCompleted && !isActive && !isLocked,
              "bg-slate-200 text-slate-400": isLocked,
            }
          )}
        >
          {isLocked ? (
            <Lock className="h-5 w-5" />
          ) : isCompleted ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <PlayCircle className="h-5 w-5" />
          )}
        </div>
        <div className="flex flex-col">
          <span
            className={cn("text-sm font-semibold", {
              "text-slate-900": !isLocked,
              "text-slate-500": isLocked,
              "text-teal-700": isActive,
            })}
          >
            {title}
          </span>
          {duration && (
            <span className="text-xs font-medium text-slate-500">{duration}</span>
          )}
        </div>
      </div>
    </div>
  )
}
