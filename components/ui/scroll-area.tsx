import * as React from 'react'
export const ScrollArea = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={`overflow-auto ${className ?? ''}`} {...p} />
export const ScrollBar = () => null
