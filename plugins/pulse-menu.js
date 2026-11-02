import { catalog, endpoints } from '../lib/pulse-api.js'
import { getMenuWeather, getMenuTime, menuStatusText, renderMenuStatus } from '../lib/menu-status.js'
import { reactToMessage } from '../lib/reactions.js'

const activeCategories = catalog.filter(category => category.endpoints.length)
const rowPrefix = 'pulse_category_'

const menuFont = text => Array.from(text, ch => {
  const code = ch.codePointAt(0)
  if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d670 + code - 65)
  if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d68a + code - 97)
  return ch
}).join('')

export function categoryText(category, prefix = '.') {
  const lines = category.endpoints.map(endpoint => {
    const spec = endpoints[`p_${category.id}_${endpoint.id}`]
    const required = spec.params.filter(p => p.required).map(p => `<${p.name}>`).join(' ')
    return `> ${prefix}p_${category.id}_${endpoint.id}${required ? ` ${required}` : ''}`
  })
  return `»»————> \`${menuFont(category.name)}\`<————««\n\n${lines.join('\n\n')}\n\n> Opciones: nombre=valor separados por |\n> ${prefix}menu para volver.`
}

export function selectedCategory(m) {
  let id = m?.msg?.singleSelectReply?.selectedRowId || m?.message?.listResponseMessage?.singleSelectReply?.selectedRowId || ''
  const native = m?.msg?.nativeFlowResponseMessage || m?.message?.interactiveResponseMessage?.nativeFlowResponseMessage
  if (!id && native?.paramsJson) {
    try {
      const data = JSON.parse(native.paramsJson)
      id = data.id || data.selected_id || data.selectedRowId || data.rowId || data.main_arg || ''
    } catch {}
  }
  if (typeof id !== 'string' || !id.startsWith(rowPrefix)) return null
  return activeCategories.find(category => category.id === id.slice(rowPrefix.length)) || null
}

const handler = async (m, { conn, usedPrefix = '.', args = [], isOwner = false, isROwner = false }) => {
  await reactToMessage(conn, m, '🕒')
  if (args[0]) {
    const category = activeCategories.find(c => c.id === args[0].toLowerCase())
    if (!category) return m.reply(`Categoría desconocida. Disponibles: ${activeCategories.map(c => c.id).join(', ')}`)
    await m.reply(categoryText(category, usedPrefix))
    await reactToMessage(conn, m, '⭐')
    return
  }
  const weather = await getMenuWeather()
  const { time, timezone } = getMenuTime()
  const status = { weather, time, timezone, user: m.pushName || m.name || 'Usuario', chatMode: m.isGroup ? 'Grupo' : 'Privado', role: isOwner || isROwner ? 'Owner' : 'Usuario' }
  const text = menuStatusText(status)
  const rows = activeCategories.map(c => ({ title: c.name, description: `${c.endpoints.length} endpoints`, id: rowPrefix + c.id }))
  try {
    if (global.baileysInteractive === false) throw new Error('Listas desactivadas')
    let image
    try { image = await renderMenuStatus(status) } catch (error) { console.warn('[Pulse tarjeta]', error.message) }
    await conn.sendMessageLia(m.chat, {
      ...(image ? { image, caption: text } : { text }),
      footer: 'Pulse Bot',
      nativeFlow: [{ text: 'Ver categorías', sections: [{ title: 'Pulse API', rows }] }],
    }, { quoted: m })
  } catch (error) {
    console.warn('[Pulse menú]', error.message)
    await m.reply(`${text}\n\nElige una categoría escribiendo:\n${activeCategories.map(c => `> ${usedPrefix}menu ${c.id}`).join('\n')}`)
  }
  await reactToMessage(conn, m, '⭐')
}
handler.all = async (m, { conn } = {}) => {
  const category = selectedCategory(m)
  if (!category) return
  await reactToMessage(conn, m, '🕒')
  await m.reply(categoryText(category))
  await reactToMessage(conn, m, '⭐')
  m.commandExecuted = true
}

handler.command = ['menu', 'menú', 'help']
handler.help = ['menu']
handler.tags = ['pulse']
export default handler
