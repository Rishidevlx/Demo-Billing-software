import { Axiom } from '@axiomhq/js'

const axiomToken = process.env.AXIOM_TOKEN
const axiomDataset = process.env.AXIOM_DATASET || 'simcha-billing-logs'

let axiomClient = null

if (axiomToken) {
  try {
    axiomClient = new Axiom({ token: axiomToken })
  } catch (err) {
    console.error('Failed to initialize Axiom client:', err.message)
  }
}

// Redact sensitive keys from logged objects
function sanitizeObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return obj
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key', 'cookie']
  const clean = Array.isArray(obj) ? [] : {}

  for (const [k, v] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
      clean[k] = '***REDACTED***'
    } else if (v && typeof v === 'object') {
      clean[k] = sanitizeObject(v, depth + 1)
    } else {
      clean[k] = v
    }
  }
  return clean
}

// Internal async ingest helper that never throws or blocks
async function sendToAxiom(events) {
  if (!axiomClient || !axiomDataset) return
  try {
    const payload = (Array.isArray(events) ? events : [events]).map(e => ({
      _time: new Date().toISOString(),
      service: 'simcha-billing-backend',
      environment: process.env.NODE_ENV || 'production',
      ...e
    }))
    await axiomClient.ingest(axiomDataset, payload)
  } catch (err) {
    // Non-blocking: Do not crash if remote logging fails
    console.error('Axiom Ingest Error:', err.message)
  }
}

export function logInfo(message, meta = {}) {
  console.log(`[INFO] ${message}`, meta)
  sendToAxiom({
    level: 'info',
    message,
    ...sanitizeObject(meta)
  })
}

export function logWarn(message, meta = {}) {
  console.warn(`[WARN] ${message}`, meta)
  sendToAxiom({
    level: 'warn',
    message,
    ...sanitizeObject(meta)
  })
}

export function logError(message, error = null, meta = {}) {
  const errorDetails = error ? {
    error_message: error.message || String(error),
    error_name: error.name || 'Error',
    error_code: error.code || null,
    error_sql_state: error.sqlState || null,
    stack: error.stack || null
  } : {}

  console.error(`[ERROR] ${message}`, error || '', meta)

  sendToAxiom({
    level: 'error',
    message,
    ...errorDetails,
    ...sanitizeObject(meta)
  })
}

export function logHttp({ method, url, statusCode, durationMs, ip, user = null, error = null }) {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
  const logData = {
    level,
    type: 'http_request',
    method,
    url,
    statusCode,
    durationMs,
    ip,
    user: user ? { id: user.id, email: user.email, name: user.name } : null
  }

  if (error) {
    logData.error_message = error.message || String(error)
    logData.stack = error.stack || null
  }

  sendToAxiom(logData)
}

export default {
  logInfo,
  logWarn,
  logError,
  logHttp
}

