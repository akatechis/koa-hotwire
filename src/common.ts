import type Koa from 'koa'
import { Wire } from './streams'
import path from 'path'
import cons from 'consolidate'

/**
 * A list of all template engines supported by consolidate.
 * Since consolidate's types don't export this, we've simply duplicated it.
 */
export type TemplateEngineName =
  | 'arc-templates'
  | 'atpl'
  | 'bracket'
  | 'dot'
  | 'dust'
  | 'eco'
  | 'ejs'
  | 'ect'
  | 'haml'
  | 'haml-coffee'
  | 'hamlet'
  | 'handlebars'
  | 'hogan'
  | 'htmling'
  | 'jade'
  | 'jazz'
  | 'jqtpl'
  | 'just'
  | 'liquid'
  | 'liquor'
  | 'lodash'
  | 'marko'
  | 'mote'
  | 'mustache'
  | 'nunjucks'
  | 'plates'
  | 'pug'
  | 'qejs'
  | 'ractive'
  | 'razor'
  | 'react'
  | 'slm'
  | 'squirrelly'
  | 'swig'
  | 'teacup'
  | 'templayed'
  | 'toffee'
  | 'twig'
  | 'underscore'
  | 'vash'
  | 'velocityjs'
  | 'walrus'
  | 'whiskers'

export interface TemplateOptions {
  engine: TemplateEngineName;
  dir: string;
  extension?: string;
}

/**
 * Represents a <turbo-frame> element that will be rendered with some content
 */
 export interface Frame {
  /**
   * The id of the frame to be rendered
   */
  id: string;

  /**
   * The template name that will be rendered into the frame
   */
  template: string;
}

/**
 * Represents a piece of a view. Can either be a template's name (string), or
 * an object describing a turbo frame, a Frame.
 * @type {[Renderable]}
 */
export type Renderable = Frame | string

/**
 * A cable is a container for 1 or more Wires. We simply represent it as a function.
 */
export type Cable = (name: string) => Wire

/**
 * A Koa Context that has been enriched with Hotwire extension points.
 */
export interface HotwireContext extends Koa.Context {
  view?: Renderable[];
  wire?: Cable;
}

export type HotwireKoa<T = any> = Koa<T, HotwireContext>

export type Renderer = (f: Renderable, s: any) => Promise<string>

export function templateRenderer (options: TemplateOptions): Renderer {
  const { dir, engine, extension } = defaultTemplateOptions(options)

  return async function renderFragment (fragment: Renderable, state: any): Promise<string> {
    const viewId = fragmentView(fragment)
    const absTmplPath = path.resolve(dir, `${viewId}.${extension}`)
    const contents = await cons[engine](absTmplPath, state)
    if (fragmentIsTurboFrame(fragment)) {
      return wrapFragmentInTurboFrame(fragment.id, contents)
    }
    return contents
  }
}

function defaultTemplateOptions(options: TemplateOptions): TemplateOptions {
  return {
    extension: 'html',
    ...options,
  }
}

export function fragmentIsTurboFrame (fragment: Renderable): fragment is Frame {
  return typeof fragment !== 'string'
}

function fragmentView (fragment: Renderable): string {
  if (fragmentIsTurboFrame(fragment)) {
    return fragment.template
  }
  return fragment
}

export function wrapFragmentInTurboFrame (fragmentId: string, content: string): string {
  return `<turbo-frame id="${fragmentId}">\n${content}\n</turbo-frame>`
}

export function wrapFragmentInTurboStream (target: string, action: string, content: string): string {
  return `<turbo-stream target="${target}" action="${action}">\n${content}\n</turbo-frame>`
}
