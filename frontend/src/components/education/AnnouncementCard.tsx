import React from "react"
import { Megaphone } from "lucide-react"
import { Card, CardContent } from "../ui/Card"

export interface AnnouncementCardProps {
  title: string
  content: string
  date?: string
  isNew?: boolean
  className?: string
}

export function AnnouncementCard({
  title,
  content,
  date,
  isNew = false,
  className,
}: AnnouncementCardProps) {
  return (
    <Card className={`relative overflow-hidden ${className || ""}`}>
      {isNew && (
        <div className="absolute left-0 top-0 h-full w-1 bg-teal-500" />
      )}
      <CardContent className="p-5">
        <div className="flex gap-4">
          <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isNew ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
            <Megaphone className="h-4 w-4" />
          </div>
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <h4 className={`font-semibold ${isNew ? 'text-slate-900' : 'text-slate-700'}`}>
                {title}
              </h4>
              {date && (
                <span className="shrink-0 text-xs font-medium text-slate-400">
                  {date}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {content}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
