type AppTheme = 'light' | 'dark'
type CoreSource = 'tgws' | 'zapret' | 'app'

// Unified log line shown in the Logs page. Type is the severity-ish level,
// payload is the text, source distinguishes which subsystem produced it.
interface ControllerLog {
  time: number
  type: 'info' | 'warn' | 'error' | 'debug'
  source: CoreSource
  payload: string
}
