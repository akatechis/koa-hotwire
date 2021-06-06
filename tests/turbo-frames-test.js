"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mocha_1 = require("mocha");
const chai_1 = require("chai");
const koa_1 = __importDefault(require("koa"));
const koa_hotwire_1 = __importDefault(require("../src/koa-hotwire"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
mocha_1.describe('koa-hotwire middleware', () => {
    mocha_1.describe('turbo-frame rendering', () => {
        let server;
        mocha_1.afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
            server.close();
        }));
        mocha_1.it('renders pages when using ctx.view in a handler', () => __awaiter(void 0, void 0, void 0, function* () {
            server = yield makeHotwireServer((ctx) => {
                ctx.view = ['top', 'body-static', 'bottom'];
            });
            const body = yield requestPage('http://localhost:5050');
            chai_1.expect(body).to.include('<html>');
            chai_1.expect(body).to.include('<head>');
            chai_1.expect(body).to.include('<title>test</title>');
            chai_1.expect(body).to.include('<div>Hello world</div>');
            chai_1.expect(body).to.include('</body>');
            chai_1.expect(body).to.include('</html>');
        }));
        mocha_1.it('passes ctx.state to render calls', () => __awaiter(void 0, void 0, void 0, function* () {
            server = yield makeHotwireServer((ctx) => {
                ctx.state.items = [
                    { name: 'Alexandros' },
                    { name: 'Ioannis' },
                    { name: 'Dimitris' },
                ];
                ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom'];
            });
            const body = yield requestPage('http://localhost:5050');
            chai_1.expect(body).to.include('<title>test</title>');
            chai_1.expect(body).to.include('<p>Alexandros</p>');
            chai_1.expect(body).to.include('<p>Ioannis</p>');
            chai_1.expect(body).to.include('<p>Dimitris</p>');
        }));
        mocha_1.it('wraps turboframes in custom elements when requested', () => __awaiter(void 0, void 0, void 0, function* () {
            server = yield makeHotwireServer((ctx) => {
                ctx.state.items = [{ name: 'Alexandros' }];
                ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom'];
            });
            const body = yield requestPage('http://localhost:5050');
            chai_1.expect(body).to.include('<html>');
            chai_1.expect(body).to.include('<title>test</title>');
            chai_1.expect(body).to.include('<turbo-frame id="frame-id">');
            chai_1.expect(body).to.include('<p>Alexandros</p>');
            chai_1.expect(body).to.include('</turbo-frame>');
        }));
        mocha_1.it('optimizes rendering when a specific turbo-frame is requested', () => __awaiter(void 0, void 0, void 0, function* () {
            server = yield makeHotwireServer((ctx) => {
                ctx.state.items = [{ name: 'Alexandros' }];
                ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom'];
            });
            const body = yield requestPage('http://localhost:5050', 'frame-id');
            chai_1.expect(body).to.not.include('<html>');
            chai_1.expect(body).to.not.include('<title>test</title>');
            chai_1.expect(body).to.include('<turbo-frame id="frame-id">');
            chai_1.expect(body).to.include('<p>Alexandros</p>');
            chai_1.expect(body).to.include('</turbo-frame>');
        }));
        mocha_1.it('returns an error when the requested frame is not in the view', () => __awaiter(void 0, void 0, void 0, function* () {
            server = yield makeHotwireServer((ctx) => {
                ctx.state.items = [{ name: 'Alexandros' }];
                ctx.view = ['top', ctx.frame('frame-id', 'body-list'), 'bottom'];
            });
            const body = yield requestPage('http://localhost:5050', 'wrong-frame');
            chai_1.expect(body).to.not.include('<html>');
            chai_1.expect(body).to.not.include('<title>test</title>');
            chai_1.expect(body).to.not.include('<turbo-frame id="frame-id">');
            chai_1.expect(body).to.include('<turbo-frame id="wrong-frame">');
            chai_1.expect(body).to.include('<p>Requested frame "wrong-frame" was not produced by the server.</p>');
            chai_1.expect(body).to.include('</turbo-frame>');
        }));
        mocha_1.it('does nothing when the handler doesn\'t produce a view', () => __awaiter(void 0, void 0, void 0, function* () {
            server = yield makeHotwireServer((ctx) => {
                ctx.body = '<html>simple page</html>';
            });
            const body = yield requestPage('http://localhost:5050');
            chai_1.expect(body).to.equal('<html>simple page</html>');
        }));
    });
});
function makeHotwireServer(handler) {
    return __awaiter(this, void 0, void 0, function* () {
        const app = new koa_1.default();
        app.use(koa_hotwire_1.default({
            tmplPath: path_1.default.resolve(__dirname, './templates'),
            tmplEngine: 'hogan',
        }));
        app.use(handler);
        return new Promise((resolve) => {
            const server = app.listen(5050, () => resolve(server));
        });
    });
}
function requestPage(url, frame) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            const options = {
                headers: {},
            };
            if (frame) {
                options.headers = { 'turbo-frame': frame };
            }
            http_1.default.get(url, options, (res) => {
                res.setEncoding('utf8');
                let resp = '';
                res.on('data', chunk => {
                    resp += chunk;
                });
                res.on('end', () => {
                    resolve(resp);
                });
            });
        });
    });
}
//# sourceMappingURL=turbo-frames-test.js.map