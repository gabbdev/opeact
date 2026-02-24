const fs = require('fs')
const crypto = require('crypto')

const genKey = (length) => {
    const chrs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)

    return Array.from(array, x => chrs[x % chrs.length]).join('')
}

const genSession = () => {
    if (!fs.existsSync('opeact_session.key')) fs.writeFileSync('opeact_session.key',`${genKey(64)},${genKey(64)}`)
    return fs.readFileSync('opeact_session.key','utf8').split(',')
}

module.exports = (app) => {
    if (!app.csa) {
        app.use(require('cookie-session')({
            name: 'session',
            keys: genSession(),
            maxAge: 7 * 24 * 60 * 60 * 1000
        }))
        app.csa = true
    }
    return app
}