# koa-hotwire
Koa middleware to enable the hotwire web application architecture

## Usage

Install the package, and a template engine of your choice (see section below)

```shell
yarn add koa-hotwire hogan
```

Set up the middleware to be aware of your template engine

```js
const Koa = require('koa')
const koaHotwire = require('koa-hotwire')

const app = new Koa()
const hotwire = koaHotwire(app, {
    tmplEngine: 'hogan',
    templPath: path.resolve(__dirname, './templates')
})
app.use(hotwire)

// register route handlers as normal

app.listen(process.env.PORT)
```

In a route handler, set the `ctx.view` property to be a list of template names that make up your page.
Use the `ctx.frame` helper to give optimization hints when a client requests a
specific turbo-frame from the page.
Use `ctx.state` to pass data to your templates

```js
// can also be router.get('/some-page', ctx => { ... })
app.use(ctx => {
    ctx.state.someData = fetchSomeData()
    ctx.view = ['header', 'nav', ctx.frame('body-frame', 'some-page'), 'footer']
})
```

## Templating Engines
This middleware uses `consolidate.js` (https://www.npmjs.com/package/consolidate), so you'll need to install one of those supported template engines, and configure this middleware to use it.
