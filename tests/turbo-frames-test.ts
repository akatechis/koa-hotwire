import { describe, it } from 'mocha'
import { expect } from 'chai'
import request from 'supertest'
import http from 'http'
import Koa from 'koa'
import path from 'path'
import { createHotwire } from '../src/koa-hotwire'

describe('koa-hotwire middleware', () => {
  describe('turbo-frame rendering', () => {
    it('renders pages when using ctx.view in a handler', async () => {
      const agent = createTestServer()
      const resp = await agent.get('/test1')
      expect(resp.headers['content-type']).to.include('text/html')
      expect(resp.headers['content-length']).to.eq('96')
      expect(resp.status).to.eq(200)
      expect(resp.text).to.include('<html>')
      expect(resp.text).to.include('<head>')
      expect(resp.text).to.include('<title>test</title>')
      expect(resp.text).to.include('<div>Hello world</div>')
      expect(resp.text).to.include('</body>')
      expect(resp.text).to.include('</html>')
    })

    it('passes ctx.state to render calls', async () => {
      const agent = createTestServer()
      const resp = await agent.get('/test2')
      expect(resp.headers['content-type']).to.include('html')
      expect(resp.headers['content-length']).to.eq('194')
      expect(resp.status).to.eq(200)
      expect(resp.text).to.include('<title>test</title>')
      expect(resp.text).to.include('<p>Alexandros</p>')
      expect(resp.text).to.include('<p>Ioannis</p>')
      expect(resp.text).to.include('<p>Dimitris</p>')
    })

    it('wraps turboframes in custom elements when requested', async () => {
      const agent = createTestServer()
      const resp = await agent.get('/test3')
      expect(resp.headers['content-type']).to.include('html')
      expect(resp.headers['content-length']).to.eq('153')
      expect(resp.text).to.include('<html>')
      expect(resp.text).to.include('<title>test</title>')
      expect(resp.text).to.include('<turbo-frame id="frame-id">')
      expect(resp.text).to.include('<p>Alexandros</p>')
      expect(resp.text).to.include('</turbo-frame>')
    })

    it('optimizes rendering when a specific turbo-frame is requested', async () => {
      const agent = createTestServer()
      const resp = await agent.get('/test3').set('turbo-frame', 'frame-id')
      expect(resp.headers['content-type']).to.include('html')
      expect(resp.headers['content-length']).to.eq('81')
      expect(resp.text).to.not.include('<html>')
      expect(resp.text).to.not.include('<title>test</title>')
      expect(resp.text).to.include('<turbo-frame id="frame-id">')
      expect(resp.text).to.include('<p>Alexandros</p>')
      expect(resp.text).to.include('</turbo-frame>')
    })

    it('returns an error when the requested frame is not in the view', async () => {
      const agent = createTestServer()
      const resp = await agent.get('/test4').set('turbo-frame', 'wrong-frame')
      expect(resp.headers['content-type']).to.include('html')
      expect(resp.headers['content-length']).to.eq('114')
      expect(resp.text).to.not.include('<html>')
      expect(resp.text).to.not.include('<title>test</title>')
      expect(resp.text).to.not.include('<turbo-frame id="frame-id">')
      expect(resp.text).to.include('<turbo-frame id="wrong-frame">')
      expect(resp.text).to.include('<p>Requested frame "wrong-frame" was not produced by the server.</p>')
      expect(resp.text).to.include('</turbo-frame>')
    })

    it('does nothing when the handler doesn\'t produce a view', async () => {
      const agent = createTestServer()
      const resp = await agent.get('/test5')
      expect(resp.headers['content-type']).to.include('html')
      expect(resp.headers['content-length']).to.eq('24')
      expect(resp.text).to.equal('<html>simple page</html>')
    })
  })
})

function createTestServer (): request.SuperTest<any> {
  const app = new Koa()
  const tmplPath = path.resolve(__dirname, './templates')
  const tmplEngine = 'hogan'

  createHotwire({ tmplPath, tmplEngine })(app)

  app.use((ctx: Koa.Context, next: () => void) => {
    if (ctx.path === '/test1') {
      ctx.view = ['top', 'body-static', 'bottom']
    }
    next()
  })
  app.use((ctx: Koa.Context, next: () => void) => {
    if (ctx.path === '/test2') {
      ctx.state.items = [
        { name: 'Alexandros' },
        { name: 'Ioannis' },
        { name: 'Dimitris' },
      ]
      ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom']
    }
    next()
  })
  app.use((ctx: Koa.Context, next: () => void) => {
    if (ctx.path === '/test3') {
      ctx.state.items = [{ name: 'Alexandros' }]
      ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom']
    }
    next()
  })
  app.use((ctx: Koa.Context, next: () => void) => {
    if (ctx.path === '/test4') {
      ctx.state.items = [{ name: 'Alexandros' }]
      ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom']
    }
    next()
  })
  app.use((ctx: Koa.Context, next: () => void) => {
    if (ctx.path === '/test5') {
      ctx.body = '<html>simple page</html>'
    }
    next()
  })

  // we have to manually create the HTTP server for Koa
  return request(http.createServer(app.callback()))
}
