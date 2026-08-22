import React from "react"
import { FileText, Download, ExternalLink } from "lucide-react"
import { Card } from "../ui/Card"

export interface ResourceCardProps {
  title: string
  type: "pdf" | "link" | "document"
  size?: string
  url: string
  onClick?: () => void
  className?: string
}

export function ResourceCard({
  title,
  type,
  size,
  url,
  onClick,
  className,
}: ResourceCardProps) {
  const isLink = type === "link"
  
  return (
    <Card 
      className={`group flex cursor-pointer items-center justify-between p-4 transition-colors hover:border-teal-500 hover:bg-teal-50/50 ${className || ""}`}
      onClick={onClick || (() => window.open(url, "_blank"))}
    >
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-100 text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition-colors">
          <FileText className="h-5 w-5" />
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="truncate text-sm font-semibold text-slate-900 group-hover:text-teal-700 transition-colors">
            {title}
          </span>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {type} {size && `• ${size}`}
          </span>
        </div>
      </div>
      
      <div className="shrink-0 pl-4 text-slate-400 group-hover:text-teal-600 transition-colors">
        {isLink ? <ExternalLink className="h-5 w-5" /> : <Download className="h-5 w-5" />}
      </div>
    </Card>
  )
}
