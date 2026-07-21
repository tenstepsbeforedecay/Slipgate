import React from 'react';
interface SwitcherCardProps {
    icon: React.ComponentType<{
        className?: string;
    }>;
    title: string;
    subtitle?: React.ReactNode;
    status: CoreStatus;
    onToggle: (next: boolean) => void | Promise<void>;
    footer?: React.ReactNode;
    onClick?: () => void;
    className?: string;
    version?: string;
    disabled?: boolean;
}
declare const SwitcherCard: React.FC<SwitcherCardProps>;
export default SwitcherCard;
