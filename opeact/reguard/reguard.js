// (22/11/2024)
const ver = 'Reguard - Megumin v1.4'

const fs = require('fs')
const imake = require('./imake')
const JSObfuscator = require('javascript-obfuscator')
let darkMode = false
let ignoreUrls = []

const reguard = (req, res, next) => {

    if (req.session.ua && req.headers['user-agent'] !== req.session.ua) {
        req.session.rexp = 0
        req.session.ua = req.headers['user-agent']
    }

    if (req.originalUrl.includes('.')) {
        for (let i = 0; i < ignoreUrls.length; i++) {
            if (req.originalUrl.startsWith(ignoreUrls[i])) {
                return next()
            }
        }
        if (!req.session.rexp || req.session.rexp < Date.now()) {
            return res.status(403).send('Forbidden - Reguard')
        } else {
            return next()
        }
    }

    if (req.originalUrl.startsWith('/reguard-api/verify')) {
        if (!req.body) return res.status(400).json({error: 'Invalid request'})
        let body 
        try {
            body = JSON.parse(req.body)
        } catch (e) {
            return res.status(400).json({error: 'Invalid request'})
        }
        if (!body.i || !body.p) return res.status(400).json({error: 'Invalid request'})
        let p
        try {
            p = imake.extractPixels(Buffer.from(body.i.replace('data:image/png;base64,',''), 'base64'))
        } catch (e) {
            return res.status(200).json({error: 'Invalid verification'})
        }
        const ppixels = p.pixels
        const oc = req.session.oc
        if (ppixels.length !== 16) return res.status(200).json({error: 'Invalid verification'})
        for (let i = 0; i < 16; i++) {
            if (Math.abs(ppixels[i] - oc[i]) > 5) return res.status(200).json({error: 'Invalid verification'})
        }
        const proto = body.p
        console.log(body)
        let protoPoints = 0

        const knownProto = [
            'webdriver~function webdriver()',
            'cookieEnabled~function cookieEnabled()',
            'plugins~function plugins()',
            'mimeTypes~function mimeTypes()',
            'doNotTrack~function doNotTrack()',
            'hardwareConcurrency~function hardwareConcurrency()',
            'maxTouchPoints~function maxTouchPoints()',
            'appVersion~function appVersion()',
            'platform~function platform()',
            'userAgent~function userAgent()',
            'vendor~function vendor()',
            'product~function product()',
            'productSub~function productSub()',
            'vendorSub~function vendorSub()',
            'language~function language()',
            'oscpu~function oscpu()'
        ].join('')

        for (let i = 0; i < proto.length; i++) {
            for (let j = 0; j < knownProto.length; j++) {
                if (proto[i].includes(knownProto[j])) {
                    protoPoints++
                }
            }
        }

        if (protoPoints < 10) return res.status(200).json({error: 'Invalid verification'})
        req.session.ua = req.headers['user-agent']
        const browserPatterns = [
            /Chrome\/[0-9.]+/,         // Google Chrome
            /Chromium\/[0-9.]+/,       // Chromium
            /Firefox\/[0-9.]+/,        // Mozilla Firefox
            /Safari\/[0-9.]+/,         // Safari (needs exclusion of Chrome)
            /Edg\/[0-9.]+/,            // Microsoft Edge (Chromium-based)
            /OPR\/[0-9.]+/,            // Opera (Chromium-based)
            /SamsungBrowser\/[0-9.]+/, // Samsung Internet
            /CriOS\/[0-9.]+/,          // Chrome on iOS
            /FxiOS\/[0-9.]+/,          // Firefox on iOS
        ]
        const isBrowser = browserPatterns.some(pattern => pattern.test(req.headers['user-agent']))
        console.log('User Agent:', req.headers['user-agent'], 'Is Browser:', isBrowser)
        if (!isBrowser) return res.status(200).json({error: 'Invalid verification'})
        req.session.rexp = Date.now() + 12 * 60 * 60 * 1000
        const ua = req.headers['user-agent']
        let str = 0
        for (let i = 0; i < ua.length; i++) {
            str += ua.charCodeAt(i)
        }
        str = str * req.session.rep
        if (str !== body.r) return res.status(200).json({error: 'Invalid verification'})
        return res.status(200).json({success: 'OK'})
    }

    if (!req.session.rexp || req.session.rexp < Date.now()) {
        
        req.session.url = req.originalUrl

        function rgb() {
            return Math.floor(Math.random() * 256)
        }

        let r1 = [rgb(), rgb(), rgb(), 255]
        let r2 = [rgb(), rgb(), rgb(), 255]
        let r3 = [rgb(), rgb(), rgb(), 255]
        let r4 = [rgb(), rgb(), rgb(), 255]

        req.session.oc = [...r1, ...r2, ...r3, ...r4]

        const f = function () {
            window.___OIF = ["OIF"]
            window.onload = async () => {
                const o = window.___OIF
                let [r1, r2, r3, r4] = o
                const canvas = document.createElement('canvas')
                canvas.width = 2
                canvas.height = 2
                const ctx = canvas.getContext('2d')
                const imgData = ctx.createImageData(2, 2)
                imgData.data.set(new Uint8ClampedArray([...r1, ...r2, ...r3, ...r4]))
                ctx.putImageData(imgData, 0, 0)
                let ua = navigator.userAgent
                let str = 0
                for (let i = 0; i < ua.length; i++) {
                    str += ua.charCodeAt(i)
                }
                str = str * o[4]
                const navigatorPrototype = () => {
                    let obj = window.navigator
                    const protoNavigator = []
                    do Object.getOwnPropertyNames(obj).forEach((name) => {
                        protoNavigator.push(name)
                    })
                    while (obj = Object.getPrototypeOf(obj))
                    let res
                    const finalProto = []
                    protoNavigator.forEach((prop) => {
                        const objDesc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigator), prop)
                        if (objDesc !== undefined) {
                            if (objDesc.value !== undefined) {
                                res = objDesc.value.toString()
                            } else if (objDesc.get !== undefined) {
                                res = objDesc.get.toString()
                            }
                        } else {
                            res = ""
                        }
                        finalProto.push(prop + "~" + res)
                    })
                    return finalProto
                }

                const ic = document.querySelector('body').isConnected

                try {
                    const req = await fetch('/reguard-api/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            i: canvas.toDataURL(),
                            p: navigatorPrototype(),
                            r: str,
                            ic
                        })
                    })
                    const res = await req.json()
                    if (res.success) {
                        setTimeout(() => {
                            location.reload()
                        }, 1000)
                    } else if (res.error) {
                        setTimeout(() => {
                            location.reload()
                        }, 6000)
                    }
                } catch (e) {
                    setTimeout(() => {
                        location.reload()
                    }, 6000)
                }
            }
        }

        let rep = Math.floor(Math.random() * 769) + 256
        
        req.session.rep = rep
        const OIF = [r1, r2, r3, r4, rep]

        const obfres = JSObfuscator.obfuscate('(' + f.toString().replace('["OIF"]', JSON.stringify(OIF)) + ')()', {
            compact: true,
            controlFlowFlattening: true,
            controlFlowFlatteningThreshold: 1,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 1,
            simplify: true,
            stringArrayShuffle: true,
            splitStrings: true,
            stringArrayThreshold: 1,
            transformObjectKeys: true,
            selfDefending: true
        })

        const str = obfres.getObfuscatedCode()

        res.status(307)
        res.send(`<!DOCTYPE html>
        <html>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title>Reguard</title>
                <script>
                    ${str}
                </script>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                    }
                    html {
                        height: 100%;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        background-color: ${darkMode ? '#141417' : '#f0f1f2'};
                        height: 100%;
                    }
                    .container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        width: 100%;
                        height: 100%;
                        flex-direction: column;
                    }
                    h1 {
                        font-size: 3rem;
                        color: ${darkMode ? '#e6e6e6' : '#404142'};
                        width: 90%;
                        text-align: center;
                        margin-bottom: 10px;
                    }
                    a {
                        font-size: 16px;
                        color: ${darkMode ? '#bababa' : '#545557'};
                        margin-bottom: 10px;
                        width: 90%;
                        text-align: center;
                        max-width: 450px;
                    }
                    #megumin {
                        width: 90%;
                        height: auto;
                        max-width: 30vh;
                        position: absolute;
                        bottom: 25px;
                    }
                    p {
                        width: 90%;
                        text-align: center;
                        font-size: 14px;
                        color: ${darkMode ? '#757575' : '#424242'};
                        position: absolute;
                        bottom: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <img src="data:image/gif;base64,${fs.readFileSync(__dirname + '/loading.gif').toString('base64')}" style="width: 60px; height: auto; position: relative; bottom: 20px; ${darkMode ? 'filter: invert(1) hue-rotate(290deg);' : ''}"/>
                    <h1>Checando seu navegador</h1>
                    <a>Esse processo é automático. Você será redirecionado em instantes.</a>
                    <img id="megumin" src="data:image/webp;base64,${fs.readFileSync(__dirname + '/megumin.webp').toString('base64')}"/>
                    <p>${ver} - ${new Date().toLocaleString()}</p>
                </div>
            </body>
        </html>`)
    } else {
        next()
    }
}

module.exports = (app, t) => {
    darkMode = !!t.importConfig.darkMode
    if (t.importConfig.opeactIgnore) ignoreUrls = t.importConfig.opeactIgnore
    app.use(reguard)
    return app
}