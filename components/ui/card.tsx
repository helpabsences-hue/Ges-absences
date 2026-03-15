import * as React from 'react'
export const Card = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...p} />
export const CardContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...p} />
export const CardHeader = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...p} />
export const CardTitle = ({ className, ...p }: React.HTMLAttributes<HTMLHeadingElement>) => <h3 className={className} {...p} />
