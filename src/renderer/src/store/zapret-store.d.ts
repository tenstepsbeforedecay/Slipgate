interface ZapretStore {
    status: CoreStatus;
    setStatus: (s: CoreStatus) => void;
}
export declare const useZapretStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ZapretStore>>;
export declare const attachZapretStore: () => (() => void);
export {};
