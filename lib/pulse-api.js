// Adaptador de los endpoints públicos documentados de Pulse API.
export const commands = {
  pulseia: { path: '/ia/gemini', param: 'prompt', example: '¿Qué es WhatsApp?' },
  pulseimagen: { path: '/ia/image', param: 'prompt', example: 'un gato astronauta' },
  pulsewiki: { path: '/busquedas/wiki', param: 'q', example: 'Uruguay' },
  pulseyoutube: { path: '/busquedas/youtube', param: 'q', example: 'música' },
  pulseanime: { path: '/anime/animeinfo', param: 'q', example: 'Naruto' },
  pulsepokemon: { path: '/anime/pokemon', param: 'name', example: 'pikachu' },
  pulseclima: { path: '/herramientas/weather', param: 'city', example: 'Maldonado' },
  pulsepais: { path: '/herramientas/country', param: 'q', example: 'Uruguay' },
  pulsemorse: { path: '/herramientas/morse', param: 'text', example: 'SOS' },
  pulsetraducir: { path: '/herramientas/traductor', param: 'text', example: 'Hello world' },
  pulsegato: { path: '/random/cat' },
  pulseperro: { path: '/random/dog' },
}

export async function requestPulse(command, text, { base = process.env.PULSE_API_URL || 'https://pulse-api-indol.vercel.app', fetcher = fetch } = {}) {
  const spec = commands[command]
  if (!spec) throw new Error('Comando desconocido')
  if (spec.param && !text.trim()) throw new Error(`Falta texto. Ejemplo: .${command} ${spec.example}`)
  const url = new URL(spec.path, base)
  if (spec.param) url.searchParams.set(spec.param, text.trim())
  const response = await fetcher(url, { signal: AbortSignal.timeout(60000) })
  const type = response.headers.get('content-type') || ''
  if (type.includes('application/json')) {
    const data = await response.json()
    if (!response.ok || data.status === false) throw new Error(data.error?.message || `HTTP ${response.status}`)
    return { kind: 'json', result: data.result }
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  if (type.startsWith('image/')) return { kind: 'image', data: Buffer.from(await response.arrayBuffer()) }
  throw new Error('La API devolvió un formato inesperado')
}

export function formatPulse(result) {
  if (typeof result === 'string') return result
  if (result?.text && typeof result.text === 'string') return result.text
  const output = JSON.stringify(result, null, 2) || 'Sin resultados.'
  return output.length > 12000 ? `${output.slice(0, 12000)}\n…` : output
}
