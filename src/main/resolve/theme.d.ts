export declare function setNativeTheme(theme: AppTheme): void;
export declare function resolveThemes(): Promise<{
    key: string;
    label: string;
}[]>;
export declare function importThemes(files: string[]): Promise<void>;
export declare function readTheme(theme: string): Promise<string>;
export declare function writeTheme(theme: string, css: string): Promise<void>;
export declare function applyTheme(theme: string): Promise<void>;
