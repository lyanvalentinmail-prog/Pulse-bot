import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requestPulse, formatPulse } from '../lib/pulse-api.js'

test('codifica consultas y lee el sobre de Pulse', async () => {
  const result = await requestPulse('pulsewiki', 'café & té', { fetcher: async url => {
    assert.equal(url.pathname, '/busquedas/wiki')
    assert.equal(url.searchParams.get('q'), 'café & té')
    return new Response(JSON.stringify({ status: true, result: { text: 'resultado' } }), { headers: { 'content-type': 'application/json' } })
  } })
  assert.equal(formatPulse(result.result), 'resultado')
})
test('devuelve imágenes binarias', async () => {
  const result = await requestPulse('pulseimagen', 'gato', { fetcher: async () => new Response(Buffer.from('imagen'), { headers: { 'content-type': 'image/jpeg' } }) })
  assert.equal(result.data.toString(), 'imagen')
})
test('informa errores de la API y parámetros faltantes', async () => {
  await assert.rejects(requestPulse('pulseia', ''), /Faltan parámetros/)
  await assert.rejects(requestPulse('pulseia', 'hola', { fetcher: async () => new Response(JSON.stringify({ status: false, error: { message: 'Sin clave' } }), { status: 503, headers: { 'content-type': 'application/json' } }) }), /Sin clave/)
})

import { catalog, endpoints, parseParams } from '../lib/pulse-api.js'
import menu, { selectedCategory } from '../plugins/pulse-menu.js'
import pulse from '../plugins/pulse-api.js'

test('todos los endpoints del catálogo tienen un comando único', () => {
  assert.equal(Object.keys(endpoints).length, catalog.reduce((n, c) => n + c.endpoints.length, 0))
  assert.equal(Object.keys(endpoints).length, 76)
  for (const [key, spec] of Object.entries(endpoints)) {
    assert.ok(pulse.command.includes(key), key)
    assert.equal(spec.path, `/${spec.category}/${spec.id}`)
  }
})

test('acepta varios parámetros y conserva símbolos en URLs', () => {
  assert.deepEqual(parseParams(endpoints.p_herramientas_emojimix, 'emoji1=😂 | emoji2=🥰'), { emoji1: '😂', emoji2: '🥰' })
  assert.deepEqual(parseParams(endpoints.p_descargas_tiktok, 'https://example.com/?x=1&y=2 | direct=true'), { url: 'https://example.com/?x=1&y=2', direct: 'true' })
  assert.throws(() => parseParams(endpoints.p_herramientas_emojimix, '😂'), /emoji2/)
  assert.throws(() => parseParams(endpoints.p_herramientas_morse, 'texto | desconocido=1'), /desconocido/)
})

test('permite recibir video, audio y documentos binarios', async () => {
  for (const [mime, kind] of [['video/mp4', 'video'], ['audio/mpeg', 'audio'], ['application/octet-stream', 'document']]) {
    const result = await requestPulse('p_descargas_tiktok', 'url=https://example.com/test | direct=true', { fetcher: async () => new Response('data', { headers: { 'content-type': mime } }) })
    assert.equal(result.kind, kind)
    assert.equal(result.data.toString(), 'data')
  }
})

test('rechaza archivos de más de 20 MB', async () => {
  await assert.rejects(requestPulse('pulsegato', '', { fetcher: async () => new Response('x', { headers: { 'content-type': 'image/png', 'content-length': String(21 * 1024 * 1024) } }) }), /20 MB/)
})

test('menú muestra solo categorías de Pulse y resuelve selecciones', async () => {
  let sent
  const m = { chat: 'chat', reply: async text => { sent = text } }
  await menu(m, { conn: { sendMessageLia: async (chat, payload) => { sent = payload } }, usedPrefix: '.', args: [] })
  const rows = sent.nativeFlow[0].sections[0].rows
  assert.equal(rows.length, 9)
  assert.ok(rows.every(row => row.id.startsWith('pulse_category_')))
  assert.equal(selectedCategory({ msg: { singleSelectReply: { selectedRowId: 'pulse_category_anime' } } }).id, 'anime')
  assert.equal(selectedCategory({ msg: { nativeFlowResponseMessage: { paramsJson: '{"id":"pulse_category_ia"}' } } }).id, 'ia')
  await menu.all({ msg: { singleSelectReply: { selectedRowId: 'pulse_category_anime' } }, reply: async text => { sent = text } })
  assert.match(sent, /\.p_anime_pokemon/)
  assert.doesNotMatch(sent, /\.kick/)
})

test('el comando genérico usa los mismos endpoints y transmite errores', async () => {
  let message
  await pulse({ reply: async text => { message = text } }, { conn: {}, command: 'pulse', text: 'invalido foo', usedPrefix: '.' })
  assert.match(message, /Endpoint desconocido/)
  await pulse({ reply: async text => { message = text } }, { conn: {}, command: 'p_ia_gemini', text: '', usedPrefix: '!' })
  assert.match(message, /!p_ia_gemini/)
})
