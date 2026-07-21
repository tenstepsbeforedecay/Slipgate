import { jsx as _jsx } from "react/jsx-runtime";
import { LockKeyhole } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
const ZapretIcon = ({ className, ...rest }) => (_jsx(LockKeyhole, { className: cn('shrink-0', className), ...rest }));
export default ZapretIcon;
