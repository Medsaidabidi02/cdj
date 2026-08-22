import React from "react"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { CourseProgress } from "./CourseProgress"

export interface CourseHeaderProps {
  title: string
  category?: string
  description?: string
  progress?: number
  isEnrolled?: boolean
  coverImage?: string
  onPrimaryAction?: () => void
  primaryActionLabel?: string
  className?: string
}

export function CourseHeader({
  title,
  category,
  description,
  progress,
  isEnrolled = false,
  coverImage,
  onPrimaryAction,
  primaryActionLabel = "Continuer",
  className,
}: CourseHeaderProps) {
  return (
    <div className={`relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-elegant ${className || ""}`}>
      {/* Background Image with Overlay */}
      {coverImage && (
        <>
          <div className="absolute inset-0">
            <img 
              src={coverImage} 
              alt={title} 
              className="h-full w-full object-cover opacity-40 mix-blend-overlay"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/80 to-transparent" />
        </>
      )}

      <div className="relative z-10 flex flex-col gap-6 p-8 md:flex-row md:items-end md:justify-between md:p-12">
        <div className="flex max-w-2xl flex-col items-start gap-4">
          {category && (
            <Badge className="bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border-none">
              {category}
            </Badge>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
            {title}
          </h1>
          {description && (
            <p className="text-lg font-medium text-slate-300 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {isEnrolled && progress !== undefined && (
          <div className="flex w-full min-w-[280px] flex-col gap-4 rounded-2xl bg-white/10 p-6 backdrop-blur-md md:w-auto">
            <CourseProgress 
              value={progress} 
              label="Votre progression"
              className="[&_span]:text-white" 
            />
            {onPrimaryAction && (
              <Button 
                className="mt-2 w-full bg-teal-500 text-white hover:bg-teal-400"
                onClick={onPrimaryAction}
              >
                {primaryActionLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
