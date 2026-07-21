import { is } from '@electron-toolkit/utils';
import { existsSync, mkdirSync } from 'fs';
import { app } from 'electron';
import path from 'path';
export const homeDir = app.getPath('home');
export function isPortable() {
    return existsSync(path.join(exeDir(), 'PORTABLE'));
}
export function dataDir() {
    if (isPortable()) {
        return path.join(exeDir(), 'data');
    }
    return app.getPath('userData');
}
export function taskDir() {
    const dir = path.join(app.getPath('userData'), 'tasks');
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    return dir;
}
export function exeDir() {
    return path.dirname(exePath());
}
export function exePath() {
    return app.getPath('exe');
}
export function resourcesDir() {
    if (is.dev) {
        // In dev __dirname is <project>/out/main, so ../.. resolves to the
        // project root which contains the `resources/` folder with all
        // Slipgate runtime binaries (tgws/, zapret/, icon files).
        const root = path.join(__dirname, '../..');
        return path.join(root, 'resources');
    }
    if (app.getAppPath().endsWith('asar')) {
        return process.resourcesPath;
    }
    return path.join(app.getAppPath(), 'resources');
}
export function resourcesFilesDir() {
    return path.join(resourcesDir(), 'files');
}
export function themesDir() {
    return path.join(dataDir(), 'themes');
}
export function appConfigPath() {
    return path.join(dataDir(), 'config.yaml');
}
export function logDir() {
    return path.join(dataDir(), 'logs');
}
export function logPath() {
    const date = new Date();
    const name = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    return path.join(logDir(), `${name}.log`);
}
export function runtimeDir() {
    return path.join(dataDir(), 'runtime');
}
export function tgwsRuntimeDir() {
    return path.join(runtimeDir(), 'tgws');
}
export function tgwsBinaryPath() {
    // Check runtime dir first (downloaded updates), fall back to bundled resources/.
    const rt = path.join(tgwsRuntimeDir(), 'TgWsProxy_windows.exe');
    if (existsSync(rt))
        return rt;
    return path.join(resourcesDir(), 'tgws', 'TgWsProxy_windows.exe');
}
export function zapretRuntimeDir() {
    return path.join(runtimeDir(), 'zapret');
}
export function zapretBundleDir() {
    const rt = zapretRuntimeDir();
    if (existsSync(path.join(rt, 'general.bat')))
        return rt;
    return path.join(resourcesDir(), 'zapret');
}
export function zapretBinaryPath() {
    return path.join(zapretBundleDir(), 'bin', 'winws.exe');
}
