import { getAppVersion } from './ipc'
// const originError = console.error

export const platform: NodeJS.Platform = window.api.platform
export let version: string = ''

export async function init(): Promise<void> {
  version = await getAppVersion()
}
