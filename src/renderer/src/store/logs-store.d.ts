interface LogsStore {
    logs: ControllerLog[];
    clear: () => void;
}
export declare const useLogsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<LogsStore>>;
export declare const attachLogsStore: () => (() => void);
export declare const formatLogTime: (t: number | string) => string;
export {};
