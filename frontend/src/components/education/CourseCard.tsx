import React from "react"
import { BookOpen, Lock, Play, Clock } from 'lucide-react';
import { Card, CardContent, CardFooter } from "../ui/Card"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import VideoPreview from "../VideoPreview"
import { Video } from "../../lib/videoService"
import { CourseProgress } from "./CourseProgress"

export interface CourseData {
  id: number
  title: string
  category: string
  cover_image: string
  professors: string[]
  totalDurationSeconds: number
  totalVideos: number
  firstVideo?: Video
}

interface CourseCardProps {
  course: CourseData
  isEnrolled: boolean
  isAuthenticated: boolean
  progress?: number
  isVisible?: boolean
  index?: number
  isHoveringVideo?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onClick?: () => void
  onActionClick?: () => void
  formatDuration: (seconds: number) => string
  t: (key: string, defaultText: string) => string
}

export function CourseCard({
  course,
  isEnrolled,
  isAuthenticated,
  progress,
  isVisible = true,
  index = 0,
  isHoveringVideo = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onActionClick,
  formatDuration,
  t,
}: CourseCardProps) {
  return (
    <Card
      className={`group flex flex-col overflow-hidden transition-all duration-700 hover:shadow-elegant transform ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-12 opacity-0"
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <div
        className="relative aspect-video overflow-hidden bg-slate-100 cursor-pointer"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {course.firstVideo && isHoveringVideo && isEnrolled && isAuthenticated ? (
          <div className="absolute inset-0">
            <VideoPreview
              video={course.firstVideo}
              maxDuration={15}
              showPlayButton={false}
              className="w-full h-full object-cover"
              onPreviewClick={onClick}
            />
          </div>
        ) : course.cover_image ? (
          <img
            src={course.cover_image}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={(e: any) => {
              e.currentTarget.onerror = null
              e.currentTarget.src =
                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiMyMmM1NWUiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiMxNmEzNGEiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgZmlsbD0idXJsKCNnKSIvPjx0ZXh0IHg9IjQwMCIgeT0iMzAwIiBmb250LWZhbWlseT0iSW50ZXIiIGZvbnQtc2l6ZT0iMzQiIGZpbGw9IiNmZmZmZmYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGFsaWdubWVudC1iYXNlbGluZT0ibWlkZGxlIiBmb250LXdlaWdodD0iNzAwIj7wn5OCKSBGB3JtYXRpb248L3RleHQ+PC9zdmc+"
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-5xl text-white opacity-90 transition-transform duration-700 group-hover:scale-105">
            <BookOpen className="w-12 h-12 text-white" />
          </div>
        )}

        {/* Course Category Badge overlay */}
        <div className="absolute top-3 left-3">
          <Badge className="bg-white/90 text-teal-800 hover:bg-white backdrop-blur-sm shadow-sm border-none">
            {course.category || "Général"}
          </Badge>
        </div>

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-14 h-14 bg-white/95 rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
            {isEnrolled && isAuthenticated ? (
              <Play className="w-6 h-6 text-teal-600 ml-1 fill-current" />
            ) : (
              <Lock className="w-6 h-6 text-slate-500" />
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">
          {course.title}
        </h3>

        <p className="text-sm text-slate-500 mb-4 flex-grow font-medium">
          {course.professors.length > 0
            ? course.professors.join(", ")
            : t("courses.instructor_placeholder", "Instructor")}
        </p>

        <div className="mt-auto">
          {progress !== undefined && (
            <div className="mb-4">
              <CourseProgress 
                value={progress} 
                label={t("my_learning.progress", "Progress")} 
                className="[&_span]:text-xs [&_span]:font-semibold" 
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-400" />
                {formatDuration(course.totalDurationSeconds)}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {course.totalVideos} {t("courses.word_videos", "videos")}
              </span>
            </div>

            <Button
              variant={isEnrolled ? "default" : "secondary"}
              onClick={onActionClick || onClick}
              className={isEnrolled && progress !== undefined && progress > 0 && progress < 100 ? "bg-teal-50 text-teal-700 hover:bg-teal-100" : ""}
            >
              {isEnrolled ? (
                progress !== undefined 
                  ? progress === 0 ? t('my_learning.start_course', 'Start Course') : progress === 100 ? t('my_learning.review_course', 'Review Course') : t('my_learning.continue', 'Continue')
                  : t("courses.view_content", "View content")
              ) : (
                <span className="flex items-center gap-2">
                  {t("courses.login_required", "Login required")} <Lock className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
