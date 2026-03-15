import * as React from 'react'
export const Select = ({ children, onValueChange, ...p }: any) => <div {...p}>{children}</div>
export const SelectTrigger = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...p} />
export const SelectContent = ({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) => <div className={className} {...p} />
export const SelectItem = ({ value, className, ...p }: any) => <div className={className} {...p} />
export const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>
