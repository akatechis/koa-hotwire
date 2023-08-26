import { describe, it, afterEach } from 'mocha'
import { expect } from 'chai'
import supertest from 'supertest'
import { createServer } from 'http'
import Koa from 'koa'
import { resolve } from 'path'
import bodyParser from 'koa-bodyparser'
import { HotwireContext, HotwireKoa, createActionCable, createStreamMiddleware } from '../src/koa-hotwire'
import WebSocket from 'ws'

describe('turbo-streams', () => {
  let wss: WebSocket.Server

  afterEach(done => {
    wss.close(done)
  })

  it('can send append updates with fragments', async () => {
    const http = createTestApp()
    const resp = await http.post('/greeting').send('greeting=Hello world')
    const [send, recv, pendingMessages] = socketListener()
    send({ join: 'greetings' })
    const appendMsg = await recv()

    // verify that the client that POST'ed gets a valid response
    expect(resp.headers['content-type']).to.include('text/html')
    expect(resp.status).to.eq(200)
    const lines = resp.text.replace(/\n/i, '')
    expect(lines).to.include('<html>')
    expect(lines).to.include('<head>')
    expect(lines).to.include('<title>test</title>')
    expect(lines).to.include('<div>Hello world</div>')
    expect(lines).to.include('</body>')
    expect(lines).to.include('</html>')

    // verify the listener got the right message, AND ONLY that message
    expect(pendingMessages()).to.equal(0)
    expect(appendMsg).to.deep.equal('<turbo-stream action="append" target="greetings"><template>Hello, Alex</template></turbo-stream>')
  })

  function createTestApp (): supertest.SuperTest<supertest.Test> {
    const app: HotwireKoa = new Koa()
    app.use(bodyParser({}))

    const dir = resolve(__dirname, './templates')
    const engine = 'hogan'
    wss = new WebSocket.Server({ port: 5050, path: '/wire' })

    app.context.wire = createActionCable({ dir, engine })
    app.use(createStreamMiddleware())

    // when a client POSTs to this path, we render a page and push an APPEND event
    app.use((ctx: HotwireContext, next: () => void) => {
      if (ctx.path === '/greeting' && ctx.method === 'POST') {
        ctx.view = [
          'top',
          'body-static',
          'bottom',
        ]
        ctx.state.message = 'Hello, Alexandros'
        ctx.wire('greetings').append('greetings', 'fragments/message')
      }
      next()
    })

    return supertest(createServer(app.callback()))
  }

  const SOCKET_LISTENER_TIMEOUT = 1000

  function socketListener(): [(msg: any) => void, () => Promise<string>, () => number] {
    const buffer = [] as String[]

    const socket = new WebSocket('ws://localhost:5050/wire')

    socket.addEventListener('message', (msg) => {
      console.log('[MSG]', msg)
      buffer.push(msg.data)
    })

    function recv(): Promise<string> {
      const timeoutErr = new Error('Timeout waiting for a Wire message')
      const start = new Date().getTime()
      return new Promise((resolve, reject) => {
        const poll = setInterval(() => {
          const msg = buffer.shift()
          if (msg !== undefined) {
            clearInterval(poll)
            resolve(msg.toString())
          }
          if (new Date().getTime() - start > SOCKET_LISTENER_TIMEOUT) {
            clearInterval(poll)
            reject(timeoutErr)
          }
        }, 50)
      })
    }

    function send(msg: any) {
      socket.emit('message', msg)
    }

    return [send, recv, () => buffer.length]
  }
})
