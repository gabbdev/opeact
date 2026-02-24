const fs = require('fs')
const sharp = require('sharp')
const mimeTypes = require('./mimetypes.json')
const Path = require('path')

sharp.cache(false)

module.exports = (app, t) => {
    const cache = t.importConfig.webpCache ? true : false
    const cacheDir = './opeact_cache/'
    if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir)
    const cachePath = (path, quality) => cacheDir + path.split('/').join('_').split('.').join('_') + '__' + String(quality) + '.webp'
    t.static = (path, url = '/__opeact/static') => {
        app.get((url.endsWith('/') ? url.substring(1) : url) + '/*', (req,res) => {
            const filePath = path + '/' + req.params['0']
            if (!Object.keys(req.query).includes('original')) {
                let quality = req.query.quality ? parseInt(req.query.quality) : 80
                if (filePath.endsWith('.png') || filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
                    if ((cache && fs.existsSync(cachePath(filePath, quality)))) {
                        res.setHeader('Content-Type', 'image/webp')
                        res.send(fs.readFileSync(cachePath(filePath, quality)))
                        return
                    } else {
                        sharp(filePath)
                        .webp({
                            quality
                        })
                        .toBuffer()
                        .then(data => {
                            res.setHeader('Content-Type', 'image/webp')
                            res.send(data)
                            if (cache) fs.writeFileSync(cachePath(filePath, quality), data)
                        })
                        .catch(e => res.send('Not found'))
                        return
                    }
                }
            }
            fs.readFile(filePath, (e,d) => {
                if (e) return res.send('Not found')
                let ext = Path.extname(req.params['0'])
                res.setHeader('Content-Type', mimeTypes[ext] || 'octet/stream')
                res.send(d)
            })
        })
    }
}