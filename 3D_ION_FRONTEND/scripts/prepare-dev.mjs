/**
 * Stops a stale Next.js dev server and removes .next/dev/lock before `next dev`.
 * Avoids "port in use" + "Unable to acquire lock" when a previous session was not closed with Ctrl+C.
 */
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const lockPath = path.join(frontendRoot, '.next', 'dev', 'lock')
const port = Number(process.env.PORT) || 3000

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function getListeningPids(targetPort) {
  const pids = new Set()

  if (process.platform === 'win32') {
    try {
      const out = execSync('netstat -ano', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
      const re = new RegExp(`:${targetPort}\\s+.*LISTENING\\s+(\\d+)`, 'i')
      for (const line of out.split(/\r?\n/)) {
        const match = line.match(re)
        if (match) pids.add(Number(match[1]))
      }
    } catch {
      // no listeners
    }
    return [...pids]
  }

  try {
    const out = execSync(`lsof -ti :${targetPort} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
    for (const pid of out.trim().split(/\s+/).filter(Boolean)) {
      pids.add(Number(pid))
    }
  } catch {
    // no listeners
  }
  return [...pids]
}

function getProcessName(pid) {
  if (process.platform === 'win32') {
    try {
      const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      })
      const match = out.match(/"([^"]+)"/)
      return match ? match[1].toLowerCase() : ''
    } catch {
      return ''
    }
  }

  try {
    return execSync(`ps -p ${pid} -o comm=`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })
      .trim()
      .toLowerCase()
  } catch {
    return ''
  }
}

function killPid(pid) {
  if (process.platform === 'win32') {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
    return
  }
  execSync(`kill -9 ${pid}`, { stdio: 'ignore' })
}

let stopped = false
for (const pid of getListeningPids(port)) {
  const name = getProcessName(pid)
  if (!name.includes('node')) {
    console.warn(
      `[prepare-dev] Port ${port} is used by ${name || 'unknown'} (PID ${pid}). Stop it manually if next dev fails.`,
    )
    continue
  }

  console.log(`[prepare-dev] Stopping previous dev server on port ${port} (PID ${pid})...`)
  try {
    killPid(pid)
    stopped = true
  } catch {
    console.warn(`[prepare-dev] Could not stop PID ${pid}.`)
  }
}

if (stopped) {
  sleep(800)
}

if (fs.existsSync(lockPath)) {
  fs.unlinkSync(lockPath)
  console.log('[prepare-dev] Removed stale .next/dev/lock')
}
