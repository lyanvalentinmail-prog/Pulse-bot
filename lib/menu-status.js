import sharp from './sharp.js'

const MAX_WEATHER_AGE = 10 * 60 * 1000
let weatherCache = null

export async function getMenuWeather({ city = process.env.PULSE_MENU_CITY || 'Maldonado', base = process.env.PULSE_API_URL || 'https://pulse-api-indol.vercel.app', fetcher = fetch, now = Date.now() } = {}) {
  const key = `${base}|${city}`
  if (weatherCache?.key === key && now - weatherCache.at < MAX_WEATHER_AGE) return weatherCache.value
  try {
    const url = new URL('/herramientas/weather', base)
    url.searchParams.set('city', city)
    const res = await fetcher(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (!data.status || !data.result?.current) throw new Error('Clima no disponible')
    const current = data.result.current
    const temp = current.temperature == null ? '' : `${current.temperature}${current.units?.temperature || '°C'}`
    const value = { city: data.result.location?.name || city, description: [temp, current.weather].filter(Boolean).join(' · ') || 'No disponible' }
    weatherCache = { key, at: now, value }
    return value
  } catch {
    return { city, description: 'No disponible' }
  }
}

export function getMenuTime(date = new Date(), timezone = process.env.PULSE_MENU_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
  try {
    return { time: new Intl.DateTimeFormat('es-UY', { timeZone: timezone, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date), timezone }
  } catch {
    return { time: new Intl.DateTimeFormat('es-UY', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(date), timezone: 'UTC' }
  }
}

export function menuStatusText({ weather, time, timezone, user, chatMode, role }) {
  return `*PULSE BOT*\n\nClima: ${weather.city} · ${weather.description}\nHora: ${time} (${timezone})\nUsuario: ${user}\nModo: ${chatMode} · ${role}\n\nSelecciona una categoría en la lista.`
}

const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c])
const safeText = value => escapeXml(Array.from(String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim()).slice(0, 42).join(''))

// WhatsApp no interpreta HTML en un mensaje: la tarjeta se rasteriza como imagen.
export function menuStatusSvg({ weather, time, timezone, user, chatMode, role }) {
  const text = safeText
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="620" viewBox="0 0 1000 620">
  <defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#101a30"/><stop offset="1" stop-color="#07111e"/></linearGradient></defs>
  <rect width="1000" height="620" rx="30" fill="url(#bg)"/>
  <circle cx="850" cy="-30" r="230" fill="#234a5a" opacity=".3"/>
  <rect x="50" y="42" width="900" height="530" rx="24" fill="#111f30" stroke="#284255"/>
  <circle cx="92" cy="82" r="6" fill="#ff6f7c"/><circle cx="114" cy="82" r="6" fill="#ffc46b"/><circle cx="136" cy="82" r="6" fill="#5bddaf"/>
  <text x="770" y="91" font-family="sans-serif" font-size="18" fill="#5bddaf" letter-spacing="3">● ONLINE</text>
  <text x="90" y="155" font-family="sans-serif" font-size="20" fill="#60dcbb" letter-spacing="4">PULSE / STATUS</text>
  <text x="90" y="207" font-family="sans-serif" font-size="39" font-weight="bold" fill="#f4fafb">Tu bot, en tiempo real</text>
  <path d="M90 235 H910" stroke="#294459"/>
  <g font-family="sans-serif" font-size="18" fill="#8aa1b5" letter-spacing="2"><text x="90" y="285">CLIMA · ${text(weather.city)}</text><text x="530" y="285">HORA · ${text(timezone)}</text><text x="90" y="415">USUARIO</text><text x="530" y="415">MODO</text></g>
  <g font-family="sans-serif" font-size="27" font-weight="bold" fill="#f1f8fb"><text x="90" y="333">${text(weather.description)}</text><text x="530" y="333">${text(time)}</text><text x="90" y="463">${text(user)}</text><text x="530" y="463">${text(chatMode)} · ${text(role)}</text></g>
  <text x="90" y="530" font-family="sans-serif" font-size="18" fill="#83a1b1">Selecciona una categoría en el botón de abajo</text>
  </svg>`
}

export async function renderMenuStatus(status) {
  return sharp(Buffer.from(menuStatusSvg(status))).png().toBuffer()
}
