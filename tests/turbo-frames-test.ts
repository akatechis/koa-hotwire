import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import Koa from 'koa'
import hotwire from '../src/koa-hotwire'
import path from 'path'
import http from 'http'

describe('koa-hotwire middleware', () => {
  describe('turbo-frame rendering', () => {
    let server: http.Server

    afterEach(async () => {
      server.close()
    })

    async function makeHotwireServer (handler: (ctx: Koa.Context) => void): Promise<http.Server> {
      const app = new Koa()
      const tmplPath = path.resolve(__dirname, './templates')
      const tmplEngine = 'hogan'
      app.use(hotwire(app, { tmplPath, tmplEngine }))
      app.use(handler)
      return new Promise((resolve) => {
        const server = app.listen(5050, () => resolve(server))
      })
    }

    it('renders pages when using ctx.view in a handler', async () => {
      server = await makeHotwireServer((ctx: Koa.Context) => {
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
      server = await makeHotwireServer((ctx: Koa.Context) => {
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
      server = await makeHotwireServer((ctx: Koa.Context) => {
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
      server = await makeHotwireServer((ctx: Koa.Context) => {
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
      server = await makeHotwireServer((ctx: Koa.Context) => {
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
      server = await makeHotwireServer((ctx: Koa.Context) => {
        ctx.body = '<html>simple page</html>'
      })
      const body = await requestPage('http://localhost:5050')
      expect(body).to.equal('<html>simple page</html>')
    })
  })
})

async function requestPage (url: string, frame?: string): Promise<string> {
  return new Promise((resolve) => {
    const options = {
      headers: {},
    }
    if (frame) {
      options.headers = { 'turbo-frame': frame }
    }
    http.get(url, options, (res) => {
      res.setEncoding('utf8')
      let resp = ''

      res.on('data', chunk => {
        resp += chunk
      })
      res.on('end', () => {
        resolve(resp)
      })
    })
  })
}
