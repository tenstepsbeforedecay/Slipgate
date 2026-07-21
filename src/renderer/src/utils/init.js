import { getAppVersion } from './ipc';
// const originError = console.error
export const platform = window.api.platform;
export let version = '';
export async function init() {
    version = await getAppVersion();
}
