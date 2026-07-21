import { type StrategyTestProgress, type StrategyTestReport } from '@renderer/utils/ipc';
interface ZapretTestStore {
    progress: StrategyTestProgress | null;
    report: StrategyTestReport | null;
    isRunning: boolean;
    set: (patch: Partial<ZapretTestStore>) => void;
}
export declare const useZapretTestStore: import("zustand").UseBoundStore<import("zustand").StoreApi<ZapretTestStore>>;
export declare const attachZapretTestStore: () => (() => void);
export {};
