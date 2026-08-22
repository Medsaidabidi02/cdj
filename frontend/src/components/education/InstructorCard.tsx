import React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/Avatar"
import { Card, CardContent } from "../ui/Card"
import { Award, BookOpen, Star } from "lucide-react"

export interface InstructorCardProps {
  name: string
  title?: string
  avatarUrl?: string
  bio?: string
  courseCount?: number
  studentCount?: number
  rating?: number
  className?: string
}

export function InstructorCard({
  name,
  title = "Formateur Expert",
  avatarUrl,
  bio,
  courseCount,
  studentCount,
  rating,
  className,
}: InstructorCardProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase()

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar className="h-20 w-20 border-2 border-white shadow-md">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback className="bg-teal-100 text-teal-700 text-xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-1">
            <h4 className="text-xl font-bold text-slate-900">{name}</h4>
            <p className="text-sm font-medium text-teal-600">{title}</p>
            
            {(courseCount !== undefined || studentCount !== undefined || rating !== undefined) && (
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm text-slate-500 sm:justify-start">
                {courseCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span>{courseCount} Cours</span>
                  </div>
                )}
                {rating !== undefined && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{rating} Avis</span>
                  </div>
                )}
                {studentCount !== undefined && (
                  <div className="flex items-center gap-1">
                    <Award className="h-4 w-4 text-slate-400" />
                    <span>{studentCount} Étudiants</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {bio && (
          <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:mt-6">
            {bio}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
