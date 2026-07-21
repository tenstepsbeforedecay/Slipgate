import { execFile } from 'child_process';
import { promisify } from 'util';
const execFilePromise = promisify(execFile);
let isAdminCached = null;
export async function isRunningAsAdmin() {
    if (isAdminCached !== null) {
        return isAdminCached;
    }
    try {
        await execFilePromise('net', ['session'], { timeout: 2000 });
        isAdminCached = true;
        return true;
    }
    catch {
        isAdminCached = false;
        return false;
    }
}
