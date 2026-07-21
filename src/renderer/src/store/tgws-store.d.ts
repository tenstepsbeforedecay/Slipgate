interface TgwsStore {
    status: CoreStatus;
    setStatus: (s: CoreStatus) => void;
}
export declare const useTgwsStore: import("zustand").UseBoundStore<import("zustand").StoreApi<TgwsStore>>;
export declare const attachTgwsStore: () => (() => void);
export {};
