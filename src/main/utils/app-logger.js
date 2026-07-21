import { BrowserWindow } from 'electron';
function broadcast(channel, ...args) {
    for (const w of BrowserWindow.getAllWindows()) {
        if (!w.isDestroyed())
            w.webContents.send(channel, ...args);
    }
}
export function appLog(type, payload) {
    broadcast('log', {
        time: Date.now(),
        type,
        source: 'app',
        payload
    });
    // Also mirror to stdout for dev convenience.
    const tag = type === 'error' ? '[app:error]' : type === 'warn' ? '[app:warn]' : '[app]';
    console.log(`${tag} ${payload}`);
}
