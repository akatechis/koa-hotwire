import { describe, it } from 'mocha'
import { expect } from 'chai'
import request from 'supertest'
import Koa from 'koa'
import { createServer } from 'http'
import { parse } from 'node-html-parser'
import { resolve } from 'path'
import {
  createFrameMiddleware,
  frame,
  HotwireContext,
  HotwireKoa,
} from '../src/koa-hotwire'

describe('turbo-frames', () => {
  it('renders pages when a handler writes to ctx.view', async () => {
    const agent = createTestServer()
    const resp = await agent.get('/test1')
    const root = parse(resp.text)
    expect(resp.headers['content-type']).to.equal('text/html; charset=utf-8')
    expect(resp.status).to.eq(200)
    expect(root.querySelector('div#hello').innerText).to.equal('Hello world')
    expect(root.querySelector('title').innerText).to.equal('test')
  })

  it('passes ctx.state to render calls', async () => {
    const agent = createTestServer()
    const resp = await agent.get('/test2')
    const root = parse(resp.text)
    expect(resp.headers['content-type']).to.equal('text/html; charset=utf-8')
    expect(resp.status).to.eq(200)
    expect(root.querySelector('title').innerText).to.equal('test')
    expect(root.querySelectorAll('#names li')).to.have.length(3)
  })

  it('wraps turboframes in custom elements when requested', async () => {
    const agent = createTestServer()
    const resp = await agent.get('/test3')
    const root = parse(resp.text)
    expect(resp.headers['content-type']).to.equal('text/html; charset=utf-8')
    expect(resp.status).to.eq(200)
    expect(root.querySelector('title').innerText).to.equal('test')
    expect(root.querySelector('turbo-frame').getAttribute('id')).to.equal('frame-id')
    expect(root.querySelector('turbo-frame li').innerText).to.equal('Alexandros')
  })

  it('optimizes rendering when a specific turbo-frame is requested', async () => {
    const agent = createTestServer()
    const resp = await agent.get('/test3').set('turbo-frame', 'frame-id')
    const root = parse(resp.text)
    expect(resp.headers['content-type']).to.equal('text/html; charset=utf-8')
    expect(resp.status).to.eq(200)
    expect(root.querySelector('html')).to.equal(null)
    expect(root.querySelector('title')).to.equal(null)
    expect(root.querySelector('turbo-frame').getAttribute('id')).to.equal('frame-id')
    expect(root.querySelector('turbo-frame li').innerText).to.equal('Alexandros')
  })

  it('returns an error when the requested frame is not in the view', async () => {
    const agent = createTestServer()
    const resp = await agent.get('/test4').set('turbo-frame', 'wrong-frame')
    const root = parse(resp.text)
    expect(resp.headers['content-type']).to.equal('text/html; charset=utf-8')
    expect(resp.status).to.eq(200)
    expect(root.querySelector('html')).to.equal(null)
    expect(root.querySelector('title')).to.equal(null)
    expect(root.querySelector('turbo-frame#frame-id')).to.equal(null)
    expect(root.querySelector('turbo-frame#wrong-frame p').innerText).to.equal('Requested frame "wrong-frame" was not produced by the server.')
  })

  it('does nothing when the handler doesn\'t produce a view', async () => {
    const agent = createTestServer()
    const resp = await agent.get('/test5')
    const lines = resp.text.replace(/\n/i, '')
    expect(resp.headers['content-type']).to.equal('text/html; charset=utf-8')
    expect(resp.status).to.eq(200)
    expect(lines).to.equal('<html>simple page</html>')
  })
})

function createTestServer (): request.SuperTest<request.Test> {
  const app: HotwireKoa = new Koa()
  const dir = resolve(__dirname, './templates')
  const engine = 'hogan'

  app.use(createFrameMiddleware({ dir, engine }))

  app.use((ctx: HotwireContext, next: Koa.Next) => {
    if (ctx.path === '/test1') {
      ctx.view = ['top', 'body-static', 'bottom']
    }
    next()
  })

  app.use((ctx: HotwireContext, next: Koa.Next) => {
    if (ctx.path === '/test2') {
      ctx.state.items = [
        { name: 'Alexandros' },
        { name: 'Ioannis' },
        { name: 'Dimitris' },
      ]
      ctx.view = ['top', frame('frame-id', 'body-list'), 'bottom']
    }
    next()
  })

  app.use((ctx: HotwireContext, next: Koa.Next) => {
    if (ctx.path === '/test3') {
      ctx.state.items = [{ name: 'Alexandros' }]
      ctx.view = ['top', frame('frame-id', 'body-list'), 'bottom']
    }
    next()
  })

  app.use((ctx: HotwireContext, next: Koa.Next) => {
    if (ctx.path === '/test4') {
      ctx.state.items = [{ name: 'Alexandros' }]
      ctx.view = ['top', frame('frame-id', 'body-list'), 'bottom']
    }
    next()
  })

  app.use((ctx: HotwireContext, next: Koa.Next) => {
    if (ctx.path === '/test5') {
      ctx.body = '<html>simple page</html>'
    }
    next()
  })

  // we have to manually create the HTTP server for Koa
  return request(createServer(app.callback()))
}
