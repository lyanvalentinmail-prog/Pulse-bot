import { commands, endpoints, requestPulse, formatPulse, usage } from '../lib/pulse-api.js'

const handler = async (m, { conn, command, text = '', usedPrefix = '.' }) => {
  let spec = commands[command]
  if (command === 'pulse') {
    const match = text.match(/^\s*(\S+)\s+(\S+)(?:\s+([\s\S]*))?$/)
    if (!match) return m.reply(`Uso: ${usedPrefix}pulse <categoría> <endpoint> [parámetros]. Abre ${usedPrefix}menu para ver la lista.`)
    spec = endpoints[`p_${match[1].toLowerCase()}_${match[2].toLowerCase()}`]
    text = match[3] || ''
  }
  if (!spec) return m.reply('Endpoint desconocido. Usa el menú para ver los disponibles.')
  try {
    const result = await requestPulse(spec, text)
    if (result.kind === 'json') return m.reply(formatPulse(result.result))
    const content = { [result.kind]: result.data, mimetype: result.mimetype }
    if (result.kind === 'document') content.fileName = 'pulse-download'
    if (result.kind !== 'audio') content.caption = 'Pulse API'
    await conn.sendMessage(m.chat, content, { quoted: m })
  } catch (error) {
    console.error('[Pulse API]', error.message)
    const detail = /Faltan parámetros|Parámetro desconocido|Demasiados valores/.test(error.message) ? `\n${usage(spec, usedPrefix)}` : ''
    await m.reply(`No se pudo consultar Pulse API: ${error.message}${detail}`)
  }
}
handler.help = ['pulse', ...Object.keys(commands)]
handler.tags = ['pulse']
handler.command = ['pulse', ...Object.keys(commands)]
export default handler
