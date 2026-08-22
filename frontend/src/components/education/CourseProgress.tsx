import React from "react"
import { Progress } from "../ui/Progress"

export interface CourseProgressProps {
  value: number
  max?: number
  label?: string
  showPercentage?: boolean
  className?: string
}

export function CourseProgress({
  value,
  max = 100,
  label = "Progression",
  showPercentage = true,
  className,
}: CourseProgressProps) {
  const percentage = Math.round(Math.min(Math.max((value / max) * 100, 0), 100))

  return (
    <div className={`flex flex-col gap-2 ${className || ""}`}>
      <div className="flex items-center justify-between text-sm font-medium">
        <span className="text-slate-700">{label}</span>
        {showPercentage && <span className="text-teal-600">{percentage}%</span>}
      </div>
      <Progress value={value} max={max} className="h-2" />
    </div>
  )
}
