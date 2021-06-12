import path from 'path'
import { createHotwire } from '../src/koa-hotwire'
import Koa from 'koa'
import http from 'http'

export async function createTestServer (handler: (ctx: Koa.Context) => void): Promise<http.Server> {
  const app = new Koa()
  const tmplPath = path.resolve(__dirname, './templates')
  const tmplEngine = 'hogan'
  createHotwire({ tmplPath, tmplEngine })(app)
  app.use(handler)
  return new Promise((resolve) => {
    const server = app.listen(5050, () => resolve(server))
  })
}

export async function requestPage (url: string, frame?: string): Promise<string> {
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
