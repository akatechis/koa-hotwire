import type Koa from 'koa'
import {
  TemplateOptions,
  HotwireContext,
  Frame,
  Renderable,
  templateRenderer,
  fragmentIsTurboFrame,
  wrapFragmentInTurboFrame,
} from './common'

export function frame (id: string, template: string): Frame {
  return { id, template }
}

export function createFrameMiddleware (options: TemplateOptions) {
  const render = templateRenderer(options)
  return async function frameMiddleware (ctx: HotwireContext, next: Koa.Next) {
    await next()

    if (ctx.view && ctx.view.length) {
      const frameId = ctx.request.header['turbo-frame']
      // client requested a specific frame
      if (typeof frameId === 'string') {
        const frame = ctx.view.find(
          (fragment: Renderable) => fragmentIsTurboFrame(fragment) && fragment.id === frameId,
        )
        // the frame that the client requested was not found in the handler's result
        if (frame === undefined) {
          ctx.body = wrapFragmentInTurboFrame(frameId, `<p>Requested frame "${frameId}" was not produced by the server.</p>`)
        }
        else {
          ctx.body = await render(frame, ctx.state)
        }
      }
      // client requested the entire page
      else {
        const htmlFrags = await Promise.all(
          ctx.view.map((frag: Renderable) => render(frag, ctx.state)),
        )
        const output = htmlFrags.join('\n')
        ctx.body = output
      }
    }
  }
}
