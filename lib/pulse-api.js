import { readFileSync } from 'node:fs'

// Instantánea del catálogo público de Pulse API; sin rutas inventadas.
export const catalog = JSON.parse(readFileSync(new URL('./pulse-catalog.json', import.meta.url), 'utf8'))
export const endpoints = Object.fromEntries(catalog.flatMap(category => category.endpoints.map(endpoint => [
  `p_${category.id}_${endpoint.id}`, { ...endpoint, category: category.id, path: `/${category.id}/${endpoint.id}` }
])))
const aliases = {
  pulseia: 'p_ia_gemini', pulseimagen: 'p_ia_image', pulsewiki: 'p_busquedas_wiki',
  pulseyoutube: 'p_busquedas_youtube', pulseanime: 'p_anime_animeinfo', pulsepokemon: 'p_anime_pokemon',
  pulseclima: 'p_herramientas_weather', pulsepais: 'p_herramientas_country', pulsemorse: 'p_herramientas_morse',
  pulsetraducir: 'p_herramientas_traductor', pulsegato: 'p_random_cat', pulseperro: 'p_random_dog',
}
export const commands = { ...endpoints, ...Object.fromEntries(Object.entries(aliases).map(([alias, key]) => [alias, endpoints[key]])) }

export function parseParams(spec, text = '') {
  const parts = text.split('|').map(part => part.trim()).filter(Boolean)
  const allowed = new Map(spec.params.map(param => [param.name.toLowerCase(), param.name]))
  // Pulse admite estas opciones comunes aunque no aparezcan en todos los formularios.
  for (const name of ['direct', 'download', 'format']) allowed.set(name, name)
  const params = {}
  for (const part of parts) {
    const match = part.match(/^([\w.]+)\s*=\s*([\s\S]*)$/)
    if (match) {
      const name = allowed.get(match[1].toLowerCase())
      if (!name) throw new Error(`Parámetro desconocido: ${match[1]}`)
      params[name] = match[2].trim()
    } else {
      const next = spec.params.find(p => !Object.hasOwn(params, p.name))
      if (!next) throw new Error('Demasiados valores. Usa nombre=valor separados por |.')
      params[next.name] = part
    }
  }
  const missing = spec.params.filter(p => p.required && !String(params[p.name] || '').trim())
  if (missing.length) throw new Error(`Faltan parámetros: ${missing.map(p => p.name).join(', ')}`)
  return params
}

export function usage(spec, prefix = '.') {
  const params = spec.params.map(p => `${p.name}${p.required ? '*' : ''}`).join(', ') || 'ninguno'
  const first = spec.params.find(p => p.required) || spec.params[0]
  const example = first?.example && !String(first.example).startsWith('__AVATAR') ? ` ${first.name}=${first.example}` : ''
  return `Parámetros (* obligatorios): ${params}\nEjemplo: ${prefix}p_${spec.category}_${spec.id}${example}`
}

const MAX_MEDIA = 20 * 1024 * 1024
async function readLimited(response) {
  const length = Number(response.headers.get('content-length'))
  if (length > MAX_MEDIA) throw new Error('El archivo supera el límite de 20 MB')
  if (!response.body) return Buffer.alloc(0)
  const reader = response.body.getReader()
  const chunks = []; let total = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.length
      if (total > MAX_MEDIA) { await reader.cancel(); throw new Error('El archivo supera el límite de 20 MB') }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  return Buffer.concat(chunks, total)
}

export async function requestPulse(command, text = '', { base = process.env.PULSE_API_URL || 'https://pulse-api-indol.vercel.app', fetcher = fetch } = {}) {
  const spec = typeof command === 'string' ? commands[command] : command
  if (!spec) throw new Error('Comando desconocido')
  const params = parseParams(spec, text)
  if (spec.path === '/herramientas/emojimix' && !('direct' in params)) params.direct = 'true'
  const url = new URL(spec.path, base)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const response = await fetcher(url, { signal: AbortSignal.timeout(60000) })
  const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase()
  if (type === 'application/json' || type.endsWith('+json')) {
    const raw = await readLimited(response)
    let data
    try { data = JSON.parse(raw.toString()) } catch { throw new Error('Pulse API devolvió JSON inválido') }
    if (!response.ok || data.status === false) throw new Error([data.error?.message || `HTTP ${response.status}`, data.error?.hint].filter(Boolean).join(' — '))
    return { kind: 'json', result: data.result }
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (type === 'text/plain') return { kind: 'json', result: (await readLimited(response)).toString() }
  const kind = type.startsWith('image/') ? 'image' : type.startsWith('audio/') ? 'audio' : type.startsWith('video/') ? 'video' : type === 'application/octet-stream' || type === 'application/vnd.android.package-archive' ? 'document' : null
  if (!kind) throw new Error('La API devolvió un formato inesperado')
  return { kind, data: await readLimited(response), mimetype: type }
}

export function formatPulse(result) {
  if (typeof result === 'string') return result
  if (result?.text && typeof result.text === 'string') return result.text
  const output = JSON.stringify(result, null, 2) || 'Sin resultados.'
  return output.length > 12000 ? `${output.slice(0, 12000)}\n…` : output
}
