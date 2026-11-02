import { commands, requestPulse, formatPulse } from '../lib/pulse-api.js'

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const spec = commands[command]
  if (spec.param && !text.trim()) return m.reply(`Uso: ${usedPrefix}${command} ${spec.example}`)
  try {
    const response = await requestPulse(command, text)
    if (response.kind === 'image') {
      await conn.sendMessage(m.chat, { image: response.data, caption: 'Pulse API' }, { quoted: m })
    } else {
      await m.reply(formatPulse(response.result))
    }
  } catch (error) {
    console.error('[Pulse API]', error.message)
    await m.reply(`No se pudo consultar Pulse API: ${error.message}`)
  }
}
handler.help = Object.keys(commands)
handler.tags = ['pulse']
handler.command = Object.keys(commands)
export default handler
