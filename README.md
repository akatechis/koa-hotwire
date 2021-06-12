# koa-hotwire

Koa middleware to enable the hotwire web application architecture

![Build](https://github.com/akatechis/koa-hotwire/actions/workflows/ci.yml/badge.svg)

## Install

Install the package, and a template engine of your choice (see section below)

```shell
yarn add koa-hotwire hogan
```

## Setup

Set up the middleware to be aware of your template engine

```ts
const Koa = require('koa')
const koaHotwire = require('koa-hotwire')

const app = new Koa()
const tmplEngine = 'hogan'
const templPath = path.resolve(__dirname, './templates')
const hotwire = koaHotwire({ tmplEngine, templPath })
hotwire(app)

// register route handlers as normal

app.listen(process.env.PORT)
```

## Turbo Frames

In a route handler, set the `ctx.view` property to be a list of template names
that make up your page. Use the `ctx.frame` helper to give optimization hints
when a client requests a specific turbo-frame from the page. Use `ctx.state` to
pass data to your templates

```ts
// can also be router.get('/some-page', ctx => { ... })
app.use(async ctx => {
    ctx.state.someData = await fetchSomeData()
    ctx.view = [
        'header',
        'nav',
        ctx.frame('body-frame', 'some-page'),
        'footer'
    ]
})
```

## Turbo Streams

Your route handlers can also publish update fragments for clients who are
subscribed.

```ts
// can also be router.get('/some-page', ctx => { ... })
app.use(async ctx => {
    // requires koa-bodyparser or equivalent to parse body
    const comment = await saveComment(ctx.request.body)
    ctx.state.comment = comment

    // render the full page for the client that posted the comment
    ctx.view = [
        'header',
        'nav',
        ctx.frame('body-frame', 'comments'),
        'footer'
    ]

    // publish a streaming update for clients that might be viewing /messages
    ctx.stream('messages').prepend('comment')
})
```

## Templating Engines

This middleware uses [consolidate.js](https://www.npmjs.com/package/consolidate)
so you'll need to install one of those supported template engines, and
configure this middleware to use it.

## Call for Help

This package is *VERY* new and as such I would love some help, particularly
with documentation, issues, bug reports, design, etc. Especially if you're
familiar with the hotwire/turbo way of doing things, I would love to hear from
you in the issues or discussions tab or on twitter: @alexandros_kat
