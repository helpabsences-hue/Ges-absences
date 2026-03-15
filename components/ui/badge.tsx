import * as React from 'react'
export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> { variant?: string }
export const Badge = ({ className, ...p }: BadgeProps) => <div className={className} {...p} />
