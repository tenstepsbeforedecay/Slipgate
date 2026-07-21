import React from 'react';
interface Props {
    title?: React.ReactNode;
    header?: React.ReactNode;
    children?: React.ReactNode;
    contentClassName?: string;
    showBackButton?: boolean;
}
declare const BasePage: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLDivElement>>;
export default BasePage;
