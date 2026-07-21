interface Props {
    disabled?: boolean;
    disabledReason?: string;
    autoUpdateCheck: boolean;
    onAutoUpdateCheckChange: (v: boolean) => void;
    onManualCheckUpdate: () => Promise<void>;
}
declare const ZapretServiceSettingsCard: React.FC<Props>;
export default ZapretServiceSettingsCard;
