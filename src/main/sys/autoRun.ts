import { spawn } from 'node:child_process'
import { app } from 'electron'
import { is } from '@electron-toolkit/utils'
import { exePath } from '../utils/dirs'

const TASK_NAME = 'SlipgateAutoStart'

/** Remove any legacy HKCU\…\Run entry left over from older versions. */
function clearLegacyRunEntry(): void {
  try {
    app.setLoginItemSettings({ openAtLogin: false })
  } catch { /* noop */ }
}

function runSchtasks(args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    let out = ''
    const p = spawn('schtasks.exe', args, { windowsHide: true })
    p.stdout?.on('data', (b) => { out += b.toString() })
    p.stderr?.on('data', (b) => { out += b.toString() })
    p.on('exit', (code) => resolve({ code: code ?? 1, out }))
    p.on('error', () => resolve({ code: 1, out }))
  })
}

/**
 * Build the schtasks /Create XML payload. We use XML rather than the
 * /TR/SC short-form because only XML supports `RunLevel=HighestAvailable`
 * + `MultipleInstancesPolicy=IgnoreNew` + delay tweaks in one call.
 */
function buildTaskXml(exe: string): string {
  const userId = `${process.env.USERDOMAIN || ''}\\${process.env.USERNAME || ''}`.replace(/^\\/, '')
  return `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Slipgate auto-launch (TG WS Proxy + Zapret)</Description>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <UserId>${userId}</UserId>
      <Delay>PT0S</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <UserId>${userId}</UserId>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>false</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <DisallowStartOnRemoteAppSession>false</DisallowStartOnRemoteAppSession>
    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>
    <Priority>4</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${exe}</Command>
      <Arguments>--hidden</Arguments>
    </Exec>
  </Actions>
</Task>`
}

export async function enableAutoRun(): Promise<void> {
  if (is.dev) return
  // Migrate away from any legacy HKCU\Run entry.
  clearLegacyRunEntry()
  const exe = exePath()
  const xml = buildTaskXml(exe)
  // schtasks reads the XML from a file path passed via /XML.
  const { writeFile, unlink } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const xmlPath = join(tmpdir(), `slipgate-task-${Date.now()}.xml`)
  // Task Scheduler expects UTF-16 LE with BOM for the XML file.
  const buf = Buffer.from('\ufeff' + xml, 'utf16le')
  await writeFile(xmlPath, buf)
  try {
    const r = await runSchtasks(['/Create', '/F', '/TN', TASK_NAME, '/XML', xmlPath])
    if (r.code !== 0) {
      throw new Error(`schtasks /Create failed (code=${r.code}): ${r.out.trim()}`)
    }
  } finally {
    try { await unlink(xmlPath) } catch { /* noop */ }
  }
}

export async function disableAutoRun(): Promise<void> {
  if (is.dev) return
  clearLegacyRunEntry()
  // /F forces silent removal even if task is missing or running.
  await runSchtasks(['/Delete', '/F', '/TN', TASK_NAME])
}

export async function isAutoRun(): Promise<boolean> {
  if (is.dev) return false
  const r = await runSchtasks(['/Query', '/TN', TASK_NAME])
  return r.code === 0
}