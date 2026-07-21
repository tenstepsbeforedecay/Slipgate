export interface StrategyTestResult {
    passed: boolean;
    okCount: number;
    totalCount: number;
    score: number;
    tested: true;
}
export interface StrategyTestReport {
    ranAt: number;
    durationMs: number;
    bundleVersion?: string;
    results: Record<string, StrategyTestResult>;
    bestStrategy?: string;
}
export declare function getStrategyTestResults(): StrategyTestReport | null;
/**
 * Run the full strategy test sweep. Holds the zapret start/stop lock for
 * the entire duration so a user toggle waits for us to finish (or queues
 * behind us). Returns the persisted report.
 */
export declare function runStrategyTests(): Promise<StrategyTestReport>;
export declare function isStrategyTestRunning(): boolean;
