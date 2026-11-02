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
  await assert.rejects(requestPulse('pulseia', ''), /Falta texto/)
  await assert.rejects(requestPulse('pulseia', 'hola', { fetcher: async () => new Response(JSON.stringify({ status: false, error: { message: 'Sin clave' } }), { status: 503, headers: { 'content-type': 'application/json' } }) }), /Sin clave/)
})
