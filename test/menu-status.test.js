import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getMenuWeather, getMenuTime, menuStatusSvg, renderMenuStatus } from '../lib/menu-status.js'
import menu, { categoryText } from '../plugins/pulse-menu.js'
import pulse from '../plugins/pulse-api.js'
import { catalog } from '../lib/pulse-api.js'

test('clima proviene de Pulse y se cachea por ciudad', async () => {
  let requests = 0
  const fetcher = async url => {
    requests++
    assert.equal(url.searchParams.get('city'), 'Test ciudad')
    return new Response(JSON.stringify({ status: true, result: { location: { name: 'Test ciudad' }, current: { temperature: 21, weather: 'Despejado', units: { temperature: '°C' } } } }), { headers: { 'content-type': 'application/json' } })
  }
  const options = { city: 'Test ciudad', base: 'https://example.com', fetcher, now: 1000 }
  assert.deepEqual(await getMenuWeather(options), { city: 'Test ciudad', description: '21°C · Despejado' })
  await getMenuWeather({ ...options, now: 1001 })
  assert.equal(requests, 1)
  assert.equal((await getMenuWeather({ ...options, city: 'Otra', fetcher: async () => { throw new Error('offline') } })).description, 'No disponible')
})

test('hora con segundos y zona válida; escapa datos en la tarjeta', async () => {
  assert.deepEqual(getMenuTime(new Date('2026-01-01T12:34:56Z'), 'UTC'), { time: '12:34:56', timezone: 'UTC' })
  assert.equal(getMenuTime(new Date(), 'no/valida').timezone, 'UTC')
  const status = { weather: { city: 'Maldonado', description: '22°C' }, time: '12:34:56', timezone: 'UTC', user: '<Alice & Bob>', chatMode: 'Grupo', role: 'Owner' }
  const svg = menuStatusSvg(status)
  assert.match(svg, /&lt;Alice &amp; Bob&gt;/)
  assert.equal((await renderMenuStatus(status)).subarray(1, 4).toString(), 'PNG')
})

test('estilo del menú y reacciones en el mensaje de lista', async () => {
  const category = catalog.find(c => c.id === 'ia')
  assert.match(categoryText(category), /»»————> `𝙸𝙰`<————««\n\n> \.p_ia_gemini <prompt>/u)
  const original = global.fetch
  const reactions = []
  let payload
  global.fetch = async () => new Response(JSON.stringify({ status: true, result: { location: { name: 'Maldonado' }, current: { temperature: 20, weather: 'Soleado' } } }))
  try {
    await menu({ chat: 'grupo', key: { id: 'msg' }, isGroup: true, pushName: 'Ana', reply: async () => {} }, {
      conn: { sendMessage: async (_chat, content) => reactions.push(content.react.text), sendMessageLia: async (_chat, content) => { payload = content } },
      usedPrefix: '.', args: [], isOwner: true,
    })
  } finally { global.fetch = original }
  assert.deepEqual(reactions, ['🕒', '⭐'])
  assert.ok(Buffer.isBuffer(payload.image))
  assert.match(payload.caption, /Grupo · Owner/)
  assert.match(payload.caption, /Ana/)
  assert.equal(payload.nativeFlow[0].sections[0].rows.length, 9)
})

test('lista falla y responde con alternativa de texto', async () => {
  const replies = []; const reactions = []
  const old = global.baileysInteractive
  global.baileysInteractive = false
  try {
    await menu({ chat: 'chat', key: { id: '1' }, reply: async text => replies.push(text) }, { conn: { sendMessage: async (_, c) => reactions.push(c.react.text) }, args: [] })
  } finally { global.baileysInteractive = old }
  assert.match(replies[0], /menu ia/)
  assert.deepEqual(reactions, ['🕒', '⭐'])
})

test('error de comando no recibe reacción de éxito', async () => {
  const reactions = []
  await pulse({ chat: 'chat', key: { id: '1' }, reply: async () => {} }, { conn: { sendMessage: async (_, c) => reactions.push(c.react.text) }, command: 'pulseia', text: '' })
  assert.deepEqual(reactions, ['🕒'])
})
