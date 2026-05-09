import React from 'react'
import { cn } from '@renderer/lib/utils'

interface TelegramIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string
}

const TelegramIcon: React.FC<TelegramIconProps> = ({ className, ...rest }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={cn('shrink-0', className)}
    {...rest}
  >
    <path d="M22.168 0.587891C22.4898 0.42642 22.8223 0.494291 23.0908 0.749023C23.3669 1.011 23.5572 1.46643 23.4844 2.00488L20.7168 22.4346C20.6516 22.9164 20.4022 23.2435 20.1309 23.3955C19.8694 23.5418 19.564 23.5449 19.2793 23.3408L11.2627 17.5947C10.9842 17.3951 10.7957 17.0424 10.7549 16.6318C10.7142 16.2223 10.8262 15.8106 11.0732 15.5195L18.2344 7.08203C18.5323 6.73097 18.4805 6.28313 18.292 6.00195C18.1955 5.85808 18.0381 5.71845 17.8232 5.66504C17.6201 5.61464 17.4159 5.65408 17.2441 5.7627L17.1729 5.81348L7.22461 13.6689C6.61763 14.1481 5.88636 14.2675 5.21582 14.0234H5.21484L0.802734 12.418C0.65122 12.3626 0.513092 12.1818 0.500977 11.8975C0.488989 11.6138 0.611742 11.4034 0.771484 11.3232L22.168 0.587891Z" />
  </svg>
)

export default TelegramIcon
