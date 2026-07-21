async function invoke(channel, ...args) {
    const res = (await window.electron.ipcRenderer.invoke(channel, ...args));
    if (!res || !res.ok) {
        throw new Error(res?.message ?? `IPC ${channel} failed`);
    }
    return res.value;
}
// ---- App config -------------------------------------------------------------
export const getAppConfig = () => invoke('app:getConfig');
export const patchAppConfig = (patch) => invoke('app:patchConfig', patch);
export const getAppVersion = () => invoke('app:version');
// ---- Theme ------------------------------------------------------------------
export const setNativeTheme = (theme) => invoke('theme:setNative', theme);
export const applyTheme = (file) => invoke('theme:apply', file);
// ---- Utility ----------------------------------------------------------------
export const openTelegramLink = (url) => invoke('shell:openTelegramLink', url);
export const writeClipboard = (text) => invoke('clipboard:writeText', text);
// ---- TG WS Proxy ------------------------------------------------------------
export const tgwsStatus = () => invoke('tgws:status');
export const tgwsStart = () => invoke('tgws:start');
export const tgwsStop = () => invoke('tgws:stop');
export const tgwsRestart = () => invoke('tgws:restart');
export const tgwsGetLink = () => invoke('tgws:getLink');
export const tgwsCheckUpdate = (force = false) => invoke('tgws:checkUpdate', force);
export const tgwsInstallUpdate = (url, expectedVersion) => invoke('tgws:installUpdate', url, expectedVersion);
export const tgwsDismissUpdate = (tag) => invoke('tgws:dismissUpdate', tag);
// ---- Zapret -----------------------------------------------------------------
export const zapretStatus = () => invoke('zapret:status');
export const zapretListStrategies = () => invoke('zapret:listStrategies');
export const zapretStart = () => invoke('zapret:start');
export const zapretStop = () => invoke('zapret:stop');
export const zapretRestart = () => invoke('zapret:restart');
export const zapretInstallBundle = (bytes) => invoke('zapret:installBundle', bytes);
export const zapretCheckUpdate = (force = false) => invoke('zapret:checkUpdate', force);
export const zapretInstallUpdate = (url, expectedVersion) => invoke('zapret:installUpdate', url, expectedVersion);
export const zapretDismissUpdate = (tag) => invoke('zapret:dismissUpdate', tag);
export const zapretRunStrategyTest = () => invoke('zapret:runStrategyTest');
export const zapretGetStrategyTestResults = () => invoke('zapret:getStrategyTestResults');
export const zapretIsStrategyTestRunning = () => invoke('zapret:isStrategyTestRunning');
export const zapretGetCuratedIpSets = () => invoke('zapret:getCuratedIpSets');
export const zapretGetIpList = () => invoke('zapret:getIpList');
export const zapretApplyIpListPatch = (patch) => invoke('zapret:applyIpListPatch', patch);
export const zapretClearIpList = () => invoke('zapret:clearIpList');
export const zapretRestoreIpListBackup = () => invoke('zapret:restoreIpListBackup');
export const zapretGetGameFilter = () => invoke('zapret:getGameFilter');
export const zapretSetGameFilter = (mode) => invoke('zapret:setGameFilter', mode);
export const zapretGetIpsetFilter = () => invoke('zapret:getIpsetFilter');
export const zapretSetIpsetFilter = (mode) => invoke('zapret:setIpsetFilter', mode);
export const zapretUpdateIpsetList = () => invoke('zapret:updateIpsetList');
export const appCheckUpdate = (force = false) => invoke('app:checkUpdate', force);
export const appInstallUpdate = (url, expectedVersion) => invoke('app:installUpdate', url, expectedVersion);
export const appDismissUpdate = (tag) => invoke('app:dismissUpdate', tag);
// ---- App control ------------------------------------------------------------
export const appQuit = () => invoke('app:quit');
export const appRelaunch = () => invoke('app:relaunch');
// Deprecated legacy stubs used by components we haven't pruned yet.
export const needsFirstRunAdmin = async () => false;
export const restartAsAdmin = async () => {
    await appRelaunch();
};
