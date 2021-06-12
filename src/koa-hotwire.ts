import path from 'path'
import cons from 'consolidate'
import type Koa from 'koa'
import type { HotwireOptions, Hotwire, Fragment, TurboFrameFragment } from './types'

type Renderer = (f: Fragment, s: any) => Promise<string>

export function createHotwire (options: HotwireOptions): Hotwire {
  const render = templateRenderer(options)
  const hotwireMiddleware = createHotwireMiddleware(render)
  return (app: Koa) => {
    app.context.frame = makeFrame
    app.use(hotwireMiddleware)
  }
}

function templateRenderer (options: HotwireOptions): Renderer {
  const { tmplPath, tmplEngine } = options

  return async function renderFragment (fragment: Fragment, state: any): Promise<string> {
    const viewId = fragmentView(fragment)
    const absTmplPath = path.resolve(tmplPath, `${viewId}.html`)
    const contents = await cons[tmplEngine](absTmplPath, state)
    if (fragmentIsTurboFrame(fragment)) {
      return wrapFragmentInTurboFrame(fragment.id, contents)
    }
    return contents
  }
}

function createHotwireMiddleware (render: Renderer) {
  return async function hotwireMiddleware (ctx: Koa.Context, next: Koa.Next) {
    await next()

    if (Array.isArray(ctx.view)) {
      const frameId = ctx.request.header['turbo-frame']
      // client requested a specific frame
      if (typeof frameId === 'string') {
        const frame = ctx.view.find(
          (fragment: Fragment) => fragmentIsTurboFrame(fragment) && fragment.id === frameId,
        )
        // the frame that the client requested was not found in the handler's result
        if (frame === undefined) {
          ctx.body = await renderFrameNotFound(frameId)
        }
        else {
          ctx.body = await render(frame, ctx.state)
        }
      }
      // client requested the entire page
      else {
        const htmlFrags = await Promise.all(
          ctx.view.map((frag: Fragment) => render(frag, ctx.state)),
        )
        ctx.body = htmlFrags.join('\n')
      }
    }
  }
}

function renderFrameNotFound (frameId: string) {
  return wrapFragmentInTurboFrame(frameId, `<p>Requested frame "${frameId}" was not produced by the server.</p>`)
}

function fragmentIsTurboFrame (fragment: Fragment): fragment is TurboFrameFragment {
  return typeof fragment !== 'string'
}

function fragmentView (fragment: Fragment): string {
  if (fragmentIsTurboFrame(fragment)) {
    return fragment.view
  }
  return fragment
}

function makeFrame (id: string, view: string): Fragment {
  return { id, view }
}

function wrapFragmentInTurboFrame (fragmentId: string, content: string) {
  return `<turbo-frame id="${fragmentId}">\n${content}\n</turbo-frame>`
}
