import React from 'react'
import { LockKeyhole, type LucideProps } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

const ZapretIcon: React.FC<LucideProps> = ({ className, ...rest }) => (
  <LockKeyhole className={cn('shrink-0', className)} {...rest} />
)

export default ZapretIcon
