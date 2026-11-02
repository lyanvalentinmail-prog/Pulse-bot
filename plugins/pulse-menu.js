import { catalog, usage, endpoints } from '../lib/pulse-api.js'

const activeCategories = catalog.filter(category => category.endpoints.length)
const rowPrefix = 'pulse_category_'

export function categoryText(category, prefix = '.') {
  const lines = category.endpoints.map(endpoint => {
    const spec = endpoints[`p_${category.id}_${endpoint.id}`]
    const required = spec.params.filter(p => p.required).map(p => `<${p.name}>`).join(' ')
    return `• ${prefix}p_${category.id}_${endpoint.id}${required ? ` ${required}` : ''}\n  ${endpoint.desc}`
  })
  return `*PULSE API · ${category.name}*\n\n${lines.join('\n')}\n\nUsa nombre=valor separados por | para opciones. * significa obligatorio.\nEjemplo: ${prefix}pulse ${category.id} ${category.endpoints[0].id} ...\n${prefix}menu para volver.`
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

const handler = async (m, { conn, usedPrefix = '.', args = [] }) => {
  if (args[0]) {
    const category = activeCategories.find(c => c.id === args[0].toLowerCase())
    if (!category) return m.reply(`Categoría desconocida. Disponibles: ${activeCategories.map(c => c.id).join(', ')}`)
    return m.reply(categoryText(category, usedPrefix))
  }
  const rows = activeCategories.map(c => ({ title: c.name, description: `${c.endpoints.length} endpoints`, id: rowPrefix + c.id }))
  try {
    if (global.baileysInteractive === false) throw new Error('Listas desactivadas')
    await conn.sendMessageLia(m.chat, {
      text: 'Selecciona una categoría de Pulse API para ver sus comandos.',
      footer: 'Pulse Bot',
      nativeFlow: [{ text: 'Ver categorías', sections: [{ title: 'Pulse API', rows }] }],
    }, { quoted: m })
  } catch (error) {
    console.warn('[Pulse menú]', error.message)
    await m.reply(`*Pulse API*\nElige una categoría escribiendo:\n${activeCategories.map(c => `• ${usedPrefix}menu ${c.id}`).join('\n')}`)
  }
}
handler.all = async (m) => {
  const category = selectedCategory(m)
  if (!category) return
  await m.reply(categoryText(category))
  m.commandExecuted = true
}
handler.command = ['menu', 'menú', 'help']
handler.help = ['menu']
handler.tags = ['pulse']
export default handler
