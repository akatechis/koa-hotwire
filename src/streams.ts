import { Cable, HotwireContext, Renderer, TemplateOptions, templateRenderer, wrapFragmentInTurboStream } from './common'
import WebSocket from 'ws'
import Koa from 'koa'

export function createStreamMiddleware() {
  return async function frameMiddleware (ctx: HotwireContext, next: Koa.Next) {
    await next()
  }
}

/**
 * Abstracts a collection of sockets, all of which are listening for events.
 * These can be application specific wires, eg. each channel in a chat
 * app or each repo in a source control app can be represented as a wire.
 */
export interface Wire {
  name: string;
  join (socket: WebSocket): void;
  leave (socket: WebSocket): void;
  append (target: string, template: string): Wire;
  prepend (target: string, template: string): Wire;
  replace (target: string, template: string): Wire;
  update (target: string, template: string): Wire;
  remove (target: string, template: string): Wire;
  before (target: string, template: string): Wire;
  after (target: string, template: string): Wire;
}

export enum StreamAction {
  Append = 'append',
  Prepend = 'prepend',
  Replace = 'replace',
  Update = 'update',
  Remove = 'remove',
  Before = 'before',
  After = 'after',
}

export function createActionCable (
  options: TemplateOptions
): Cable {
  const allSockets: SocketDict = {}
  const render = templateRenderer(options)

  return function (this: HotwireContext, name: string): Wire {
    const enqueueAction = makeDispatcher(render, allSockets[name])
    const state = this.state

    return {
      name,
      join (socket: WebSocket) {
        if (!allSockets[name]) {
          allSockets[name] = new Set()
        }
        allSockets[name]?.add(socket)
      },
      leave (socket: WebSocket) {
        allSockets[name]?.delete(socket)
        // close socket if it's no longer a member of any other wires?
      },
      append (target: string, template: string) {
        enqueueAction(StreamAction.Append, target, template, state)
        return this
      },
      prepend (target: string, template: string) {
        enqueueAction(StreamAction.Prepend, target, template, state)
        return this
      },
      replace (target: string, template: string) {
        enqueueAction(StreamAction.Replace, target, template, state)
        return this
      },
      update (target: string, template: string) {
        enqueueAction(StreamAction.Update, target, template, state)
        return this
      },
      remove (target: string, template: string) {
        enqueueAction(StreamAction.Remove, target, template, state)
        return this
      },
      before (target: string, template: string) {
        enqueueAction(StreamAction.Before, target, template, state)
        return this
      },
      after (target: string, template: string) {
        enqueueAction(StreamAction.After, target, template, state)
        return this
      },
    }
  }
}

function makeDispatcher (render: Renderer, sockets?: Set<WebSocket>) {
  return async (
    event: StreamAction,
    target: string,
    template: string,
    state: any,
  ) => {
    if (!sockets) {
      return
    }
    const markup = await render(template, state)
    for (const socket of sockets) {
      socket.emit('message', wrapStreamAction(target, event, markup))
    }
  }
}

interface SocketDict {
  [name: string]: Set<WebSocket>;
}

function wrapStreamAction(target: string, action: StreamAction, content: string): any {
  wrapFragmentInTurboStream(target, action, content)
}
