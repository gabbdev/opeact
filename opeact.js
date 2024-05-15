// Opeact Dev 2.4
// By Gabb
// Ultimo update: 05/03/24

const JSDOM = require('jsdom').JSDOM
const fs = require('fs')
const Path = require('path')
const express = require('express')
const app = express()
const mimeTypes = require('./mimeTypes.json')

app.use(express.raw({type: '*/*'}))

const t = {app}

const interpreter = (s) => {
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
        if (w === '<' && s[i + 1] !== ' ' && s[i + 1] !== '/' && !v.e && !v.q && v.c === 0 && !f) v.e = i;
    }
    return sf
}

const r = (f) => fs.readFileSync(f, 'utf8')

const newDocument = (htmlString) => {
    const document = new JSDOM(htmlString).window.document
    document.importHead = (...paths) => {for (const path of paths) document.head.outerHTML = r(path)}
    document.importStyle = (...paths) => {for (const path of paths) document.head.append($__(`<style>${r(path)}</style>`))}
    document.importScript = (...paths) => {for (const path of paths) document.head.append($__(`<script>${r(path)}</script>`))}
    return document
}

const $__ = (htmlString) => {
    if (htmlString.trim().startsWith('<html>') || htmlString.trim().startsWith('<!DOCTYPE')) return newDocument(htmlString)
    const document = new JSDOM('').window.document
    document.body.innerHTML = htmlString
    return document.body.firstChild
}

t.listen = app.listen

t.createServer = () => {
    const { createServer } = require("http")
    const httpServer = createServer(app)
    return httpServer
}

t.static = (path, url = '/__opeact/static') => {
    app.get((url.endsWith('/') ? url.substring(1) : url) + '/*', (req,res) => {
        fs.readFile(path + '/' + req.params['0'], (e,d) => {
            if (e) return res.send('Not found')
            let ext = Path.extname(req.params['0'])
            res.setHeader('Content-Type', mimeTypes[ext] || 'octet/stream')
            res.send(d)
        })
    })
}

t.import = (...callbacks) => {
    for (const cb of callbacks) cb(app)
}

for (const method of ['delete', 'get', 'head', 'patch', 'post', 'put', 'options', 'search', 'trace', 'propfind', 'proppatch', 'mkcol', 'copy', 'move', 'lock', 'unlock']) {
    t[method] = (name,src,...toExport) => {
        if (!src || !name) return
        if (typeof(src) === 'function') return app[method](name,src)
        if (typeof(src) === 'string' && src.endsWith('.html')) return app[method](name, (req,res) => res.send(r(src)))
        if (typeof(src) === 'string' && src.startsWith('http')) return app[method](name, (req,res)=> res.redirect(src))
        app[method](name, (req,res) => {
            eval(`
            (async ()=> {
                try {
                    let __ = await (${interpreter(r(src))})(req,res,...toExport)
                    if (!__) return
                    if (String(__).includes('HTML') && String(__).includes('Element')) return res.type('text/html').send("<!DOCTYPE html>" + __.outerHTML)
                    if (String(__) == '[object Document]') return res.type('text/html').send("<!DOCTYPE html>" + __.documentElement.outerHTML)
                    if (__.innerHTML) return res.type('text/html').send("<!DOCTYPE html>" + __.innerHTML)
                    res.send(__)
                } catch (_) {
                    console.error(_)
                }
            })()
            `)
        })
    }
}

module.exports = t