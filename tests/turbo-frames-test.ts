import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import http from 'http'
import Koa from 'koa'
import { createTestServer, requestPage } from './test-server'

describe('koa-hotwire middleware', () => {
  describe('turbo-frame rendering', () => {
    let server: http.Server

    afterEach(async () => {
      server.close()
    })

    it('renders pages when using ctx.view in a handler', async () => {
      server = await createTestServer((ctx: Koa.Context) => {
        ctx.view = ['top', 'body-static', 'bottom']
      })
      const body = await requestPage('http://localhost:5050')
      expect(body).to.include('<html>')
      expect(body).to.include('<head>')
      expect(body).to.include('<title>test</title>')
      expect(body).to.include('<div>Hello world</div>')
      expect(body).to.include('</body>')
      expect(body).to.include('</html>')
    })

    it('passes ctx.state to render calls', async () => {
      server = await createTestServer((ctx: Koa.Context) => {
        ctx.state.items = [
          { name: 'Alexandros' },
          { name: 'Ioannis' },
          { name: 'Dimitris' },
        ]
        ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom']
      })
      const body = await requestPage('http://localhost:5050')
      expect(body).to.include('<title>test</title>')
      expect(body).to.include('<p>Alexandros</p>')
      expect(body).to.include('<p>Ioannis</p>')
      expect(body).to.include('<p>Dimitris</p>')
    })

    it('wraps turboframes in custom elements when requested', async () => {
      server = await createTestServer((ctx: Koa.Context) => {
        ctx.state.items = [{ name: 'Alexandros' }]
        ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom']
      })
      const body = await requestPage('http://localhost:5050')
      expect(body).to.include('<html>')
      expect(body).to.include('<title>test</title>')
      expect(body).to.include('<turbo-frame id="frame-id">')
      expect(body).to.include('<p>Alexandros</p>')
      expect(body).to.include('</turbo-frame>')
    })

    it('optimizes rendering when a specific turbo-frame is requested', async () => {
      server = await createTestServer((ctx: Koa.Context) => {
        ctx.state.items = [{ name: 'Alexandros' }]
        ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom']
      })
      const body = await requestPage('http://localhost:5050', 'frame-id')
      expect(body).to.not.include('<html>')
      expect(body).to.not.include('<title>test</title>')
      expect(body).to.include('<turbo-frame id="frame-id">')
      expect(body).to.include('<p>Alexandros</p>')
      expect(body).to.include('</turbo-frame>')
    })

    it('returns an error when the requested frame is not in the view', async () => {
      server = await createTestServer((ctx: Koa.Context) => {
        ctx.state.items = [{ name: 'Alexandros' }]
        ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom']
      })
      const body = await requestPage('http://localhost:5050', 'wrong-frame')
      expect(body).to.not.include('<html>')
      expect(body).to.not.include('<title>test</title>')
      expect(body).to.not.include('<turbo-frame id="frame-id">')
      expect(body).to.include('<turbo-frame id="wrong-frame">')
      expect(body).to.include('<p>Requested frame "wrong-frame" was not produced by the server.</p>')
      expect(body).to.include('</turbo-frame>')
    })

    it('does nothing when the handler doesn\'t produce a view', async () => {
      server = await createTestServer((ctx: Koa.Context) => {
        ctx.body = '<html>simple page</html>'
      })
      const body = await requestPage('http://localhost:5050')
      expect(body).to.equal('<html>simple page</html>')
    })
  })
})
