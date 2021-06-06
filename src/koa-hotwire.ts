import path from 'path'
import cons from 'consolidate'
import type Koa from 'koa'
import type { TemplateEngineName } from './types'

export interface HotwireOptions {
  tmplEngine: TemplateEngineName;
  tmplPath: string;
}

export interface TurboFrameFragment {
  id: string;
  view: string;
}

export type Fragment = TurboFrameFragment | string

export default function makeHotwireMiddleware (options: HotwireOptions) {
  const render = templateRenderer(options)

  return async function hotwireMiddleware (ctx: Koa.Context, next: Koa.Next) {
    ctx.frame = makeFrame
    await next()

    if (Array.isArray(ctx.view)) {
      const frameId = ctx.request.header['turbo-frame']
      if (typeof frameId === 'string') {
        const frame = ctx.view.find(
          (fragment: Fragment) => fragmentIsTurboFrame(fragment) && fragment.id === frameId,
        )
        // the frame that the client requested was not found in the handler's result
        if (frame === undefined) {
          ctx.body = await renderFrameNotFound(frameId)
        } else {
          ctx.body = await render(frame, ctx.state)
        }
      } else {
        const htmlFrags = await Promise.all(
          ctx.view.map((frag: Fragment) => render(frag, ctx.state)),
        )
        ctx.body = htmlFrags.join('\n')
      }
    }
  }
}

function templateRenderer (options: HotwireOptions) {
  const { tmplPath, tmplEngine } = options

  return async function renderFragment (fragment: Fragment, state: any) {
    const viewId = fragmentView(fragment)
    const absTmplPath = path.resolve(tmplPath, `${viewId}.html`)
    const contents = await cons[tmplEngine](absTmplPath, state)
    if (fragmentIsTurboFrame(fragment)) {
      return wrapFragmentInTurboFrame(fragment.id, contents)
    }
    return contents
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
