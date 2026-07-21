import { appConfigPath, dataDir, logDir, runtimeDir, themesDir, tgwsRuntimeDir, zapretRuntimeDir } from './dirs';
import { defaultConfig } from './template';
import { stringifyYaml } from './yaml';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { app } from 'electron';
async function initDirs() {
    if (!existsSync(dataDir())) {
        await mkdir(dataDir(), { recursive: true });
    }
    const dirs = [
        themesDir(),
        logDir(),
        runtimeDir(),
        tgwsRuntimeDir(),
        zapretRuntimeDir()
    ];
    await Promise.all(dirs.map(async (dir) => {
        if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
        }
    }));
}
async function initConfig() {
    if (!existsSync(appConfigPath())) {
        await writeFile(appConfigPath(), stringifyYaml(defaultConfig));
    }
}
function initDeeplink() {
    if (process.defaultApp) {
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient('slipgate', process.execPath, [
                path.resolve(process.argv[1])
            ]);
            app.setAsDefaultProtocolClient('tg-ws', process.execPath, [
                path.resolve(process.argv[1])
            ]);
        }
    }
    else {
        app.setAsDefaultProtocolClient('slipgate');
        app.setAsDefaultProtocolClient('tg-ws');
    }
}
export async function init() {
    await initDirs();
    await initConfig();
    initDeeplink();
}
