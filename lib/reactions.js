export async function reactToMessage(conn, m, emoji) {
  if (!m?.key || !conn?.sendMessage) return
  try { await conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } }) } catch (error) {
    console.warn('[reacción]', error?.message || error)
  }
}
