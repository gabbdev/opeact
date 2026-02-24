// Opeact Dev 3.0
// By Gabb
// Update: 05/02/26

import express from 'express'
import { JSDOM } from 'jsdom'
import fs from 'fs'
import Path, { parse } from 'path'
import mimetypes from './mimetypes.json' with { type: 'json' }
import { createServer } from 'http'
import vm from 'vm'

const app = express()

app.disable('x-powered-by')

app.use(express.raw({
    type: '*/*',
    limit: '30mb'
}))

app.opeact_utils = {}

const t = {
    app,
    enableObfuscation: false,
    get: (app.get).bind(app),
    post: (app.post).bind(app),
    put: (app.put).bind(app),
    delete: (app.delete).bind(app),
    listen: (app.listen).bind(app),
    createServer () {
        const httpServer = createServer(app)
        return httpServer
    },
    start (...args) {
        const server = t.createServer()
        server.listen(...args)
        debug.log(`<bg:#c4e0f2><cl:#112633>Opeact</cl></bg> <cl:#00ff00>●</cl> Started on port ${args[0]}`)
        return server
    },
    static (path, url = '/__opeact/static') {
        debug.log(`<bg:#c4e0f2><cl:#112633>Opeact</cl></bg> <cl:#ffae00>●</cl> Static files served from ${path} at <bg:#545e57><cl:#e1f2e6> ${url} </cl></bg>`)

        let routePath = (url.endsWith('/') ? url.substring(1) : url)
        app.get(routePath + '/*file', (req,res) => {

            const targetFile = req.params.file.join('/')
            const fullPath = Path.join(path, targetFile)

            fs.readFile(fullPath, (e,d) => {
                if (e) return res.send('Not found')
                let ext = Path.extname(targetFile)
                res.setHeader('Content-Type', mimetypes[ext] || 'octet/stream')
                res.send(d)
            })
        })
    },
    import (...callbacks) {
        for (const cb of callbacks) cb(app, t)
    }
}

const parseHTML = (s) => {
    s = s.toString()
    let sf = String(s)
    let v = {q: 0, e: 0, c: 0, d: 0}
    for (let i = 0; i < s.length; i++) {
        let w = s[i], f = 0
        if (w === '"' || w === '\'' || w === '`') if (!v.e && !v.q) {v.q = i} else if (v.q) v.q = false
        if (s[i] + s[i + 1] === '</' && v.e && !v.q && v.c < 1 || s[i] + s[i + 1] === '/>' && v.e && !v.q && v.c < 1) {
            let el = sf.substring(v.e + v.d, sf.indexOf('>',i + v.d) + 1), sl = 0
            for (const w_ of el) if (w_ === '`') sl++
            el = el.split('`').join('\\`')
            sf = sf.substring(0, v.e + v.d) + '$__(`' + el + '`)' + sf.substring(v.e + v.d + el.length - sl)
            v = {...v, d: v.d + 7, e: 0}
            f = 1
        }
        if (w === '<' && s[i + 1] !== ' ' && v.e && !v.q &&  s[i] + s[i + 1] !== '</') v.c += 1
        if (s[i] + s[i + 1] === '</' && v.e && !v.q && v.c > 0 || s[i] + s[i + 1] === '/>' && v.e && !v.q && v.c > 0) v.c -= 1
        if (w === '<' && s[i + 1] !== ' ' && s[i + 1] !== '/' && !v.e && !v.q && v.c === 0 && !f) v.e = i
    }
    return sf
}

function parseTemplate(text) {
    const hexToRgb = (hex) => {
        const bigint = parseInt(hex.slice(1), 16)
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
    }

    let output = text

    // Cores (Foreground e Background)
    output = output.replace(/<cl:(#[0-9a-fA-F]{6})>/g, (match, hex) => {
        const [r, g, b] = hexToRgb(hex)
        return `\x1b[38;2;${r};${g};${b}m`
    })
    output = output.replace(/<bg:(#[0-9a-fA-F]{6})>/g, (match, hex) => {
        const [r, g, b] = hexToRgb(hex)
        return `\x1b[48;2;${r};${g};${b}m`
    })

    // Negrito: <b> texto </b> ou **texto**
    output = output.replace(/<b>|<\*\*>/g, '\x1b[1m').replace(/<\/b>|<\/\*\*>/g, '\x1b[22m')
    
    // Itálico: <i> texto </i> ou *texto*
    output = output.replace(/<i>|<\*>/g, '\x1b[3m').replace(/<\/i>|<\/\*>/g, '\x1b[23m')
    
    // Sublinhado: <u> texto </u> ou __texto__
    output = output.replace(/<u>|<__>/g, '\x1b[4m').replace(/<\/u>|<\/__>/g, '\x1b[24m')
    
    // Riscado: <s> texto </s> ou ~~texto~~
    output = output.replace(/<s>|<~~>/g, '\x1b[9m').replace(/<\/s>|<\/~~>/g, '\x1b[29m')

    // Reset de Cores
    output = output.replace(/<\/cl>/g, '\x1b[39m') 
    output = output.replace(/<\/bg>/g, '\x1b[49m') 
    
    // Reset Total (opcional, use <r> para limpar tudo)
    output = output.replace(/<r>/g, '\x1b[0m')

    return output
}

const debug = {
    log: (...args) => {
        const parsedArgs = args.map(arg => typeof arg === 'string' ? parseTemplate(arg) : arg)
        console.log(...parsedArgs)
    },
    error: (...args) => {
        const parsedArgs = args.map(arg => typeof arg === 'string' ? parseTemplate(arg) : arg)
        console.error(...parsedArgs)
    }
}

const r = (f) => fs.readFileSync(f, 'utf8')

const scriptCache = {}

function hash(str) {
    return require('crypto').createHash('sha256').update(str).digest('hex')
}

const newDocument = (htmlString) => {
    let document = new JSDOM(htmlString).window.document
    document.importHead = (...paths) => {for (const path of paths) document.head.outerHTML = r(path)}
    document.importStyle = (...paths) => {for (const path of paths) document.head.append($__(`<style>${r(path)}</style>`))}
    document.importObject = (...objs) => {
        for (const obj of objs) {
            if (!document.importObjects) document.importObjects = []
            document.importObjects.push(obj)
        }
    }
    document.importScript = (...paths) => {
        for (const path of paths) {
            if (t.enableObfuscation) {
                const { obfuscate } = require('javascript-obfuscator')
                let script = r(path)
                let code = script
                if (scriptCache[hash(path)] && scriptCache[hash(path)].hash === hash(script)) {
                    code = scriptCache[hash(path)].content
                } else {
                    const obfuscated = obfuscate(script, {
                        compact: true,
                        controlFlowFlattening: true,
                        controlFlowFlatteningThreshold: 1,
                        deadCodeInjection: true,
                        deadCodeInjectionThreshold: 1
                    })
                    code = obfuscated.getObfuscatedCode()
                    scriptCache[hash(path)] = {content: code, hash: hash(script)}
                    debug.log(`<bg:#c4e0f2><cl:#112633>Opeact</cl></bg> <cl:#2e70ff>●</cl> Script ${path} imported and obfuscated.`)
                }

                if (document.importObjects) {
                    let importCode = `window.getOpeactObject = (name) => {
                        for (const obj of (${JSON.stringify(document.importObjects)})) {
                            if (obj.name === name) return obj.value
                        }
                    }`
                    importCode = obfuscate(importCode, {compact: true}).getObfuscatedCode()
                    code = importCode + '\n' + code
                }
                document.head.append($__(`<script type="text/javascript">${code}</script>`))
            } else  {
                let script = r(path)
                if (document.importObjects) {
                    let importCode = `window.getOpeactObject = (name) => {
                        for (const obj of (${JSON.stringify(document.importObjects)})) {
                            if (obj.name === name) return obj.value
                        }
                    }`
                    script = importCode + '\n' + script
                }
                document.head.append($__(`<script type="text/javascript">${script}</script>`))
            }
        }
    }
    if (t.afterParseDocument) document = t.afterParseDocument(document)
    return document
}

const $__ = (s) => {
    if (s.trim().startsWith('<html>') || s.trim().startsWith('<!DOCTYPE')) return newDocument(s)
    return newDocument('<html><body>' + s + '</body></html>').body.firstChild
}

for (const method of ['all', 'delete', 'get', 'head', 'patch', 'post', 'put', 'options', 'search', 'trace', 'propfind', 'proppatch', 'mkcol', 'copy', 'move', 'lock', 'unlock']) {
    t[method] = (name,src,...toExport) => {
        if (!src || !name) return
        if (typeof(src) === 'function') return app[method](name,src)
        if (typeof(src) === 'string' && src.endsWith('.html')) return app[method](name, (req,res) => res.send(r(src)))
        if (typeof(src) === 'string' && src.startsWith('http')) return app[method](name, (req,res)=> res.redirect(src))
        app[method](name, async (req,res) => {
            const sandbox = {
                parseHTML,
                r,
                src,
                req,
                res,
                $__,
                toExport,
                app,
                t,
                console
            }
            vm.createContext(sandbox)
            const code = `
            (async ()=> {
                let __ = await (${parseHTML(r(src))})(req,res,...toExport)
                if (!__) return
                if (String(__).includes('HTML') && String(__).includes('Element')) return res.type('text/html').send("<!DOCTYPE html>" + __.outerHTML)
                if (String(__) == '[object Document]') return res.type('text/html').send("<!DOCTYPE html>" + __.documentElement.outerHTML)
                if (__.innerHTML) return res.type('text/html').send("<!DOCTYPE html>" + __.innerHTML)
                res.send(__)
            })()
            `
            const result = vm.runInContext(code, sandbox)
            result.catch(e => {
                const errorDetails = {
                    type: e.name,
                    message: e.message,
                    stack: e.stack ? e.stack.split('\n').map(line => line.trim()) : []
                }
                errorDetails.stack.shift()

                const lineOfError = errorDetails.stack.find(line => line.includes('evalmachine.<anonymous>'))
                if (lineOfError) {
                    const match = lineOfError.match(/evalmachine\.<anonymous>:(\d+):(\d+)/)
                    if (match) {
                        const lineNumber = parseInt(match[1]) - 2
                        const columnNumber = parseInt(match[2])
                        errorDetails.stack.unshift(`at ${src}:${lineNumber}:${columnNumber}`)
                    }
                }
                let tabSize = 4
                errorDetails.stack = errorDetails.stack.map(line => {
                    return ' '.repeat(tabSize) + '╰▸ ' + line
                })

                res.status(500).send('Internal Server Error')
                debug.error(`<bg:#c4e0f2><cl:#112633>Opeact</cl></bg> <cl:#ff0000>●</cl> Error processing ${method.toUpperCase()} request for <bg:#545e57><cl:#e1f2e6> ${name} </cl></bg>: A <b>${errorDetails.type}</b> occurred.\n╰─▶ <cl:#ff5555>${errorDetails.message}</cl>\n${errorDetails.stack.join('\n')}`)
            })
        })
    }
}

export default t

/*            eval(`
            (async ()=> {
                try {
                    let __ = await (${parseHTML(r(src))})(req,res,...toExport)
                    if (!__) return
                    if (String(__).includes('HTML') && String(__).includes('Element')) return res.type('text/html').send("<!DOCTYPE html>" + __.outerHTML)
                    if (String(__) == '[object Document]') return res.type('text/html').send("<!DOCTYPE html>" + __.documentElement.outerHTML)
                    if (__.innerHTML) return res.type('text/html').send("<!DOCTYPE html>" + __.innerHTML)
                    res.send(__)
                } catch (_) {
                    console.error(_)
                }
            })()
            `)*/