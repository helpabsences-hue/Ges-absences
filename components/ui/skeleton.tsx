import * as React from 'react'
export const Skeleton = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) =>
  <div className={`animate-pulse bg-slate-800 rounded ${className ?? ''}`} {...p} />
