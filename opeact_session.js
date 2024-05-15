const fs = require('fs')

const genKey = (length) => {
    let result = ''
    let chrs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    chrs += chrs.toLocaleLowerCase() + '0123456789'
    for (let i = 0; i < length; i ++) {
        result += chrs.charAt(Math.floor(Math.random() * chrs.length))
    }
    return result
}

const genSession = () => {
    if (!fs.existsSync('opeact_session.key')) fs.writeFileSync('opeact_session.key',`${genKey(64)},${genKey(64)}`)
    return fs.readFileSync('opeact_session.key','utf8').split(',')
}

module.exports = (app) => {
    if (!app.csa) {
        app.use(require('cookie-session')({
            name: 'session',
            keys: genSession()
        }))
        app.csa = true
    }
    return app
}