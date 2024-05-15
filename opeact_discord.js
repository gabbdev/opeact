// Atualizado em 30/09/2023

const fetch = require('node-fetch') // 2.6.7
const fs = require('fs')

const resolve = (str) => str.endsWith('/') ? str.slice(0,str.length - 1) : str

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
    if (!fs.existsSync('key.sess')) fs.writeFileSync('key.sess',`${genKey(64)},${genKey(64)}`)
    return fs.readFileSync('key.sess','utf8').split(',')
}

let discord = async (req,res,next) => {
    let options = req.app.utils.discord
    req.discord = {}

    req.discord.login = (_options = {redirect_uri: '', client_id: '', client_secret: '', scope: 'identify email'}) => {
        options = _options
        req.app.utils.discord = options
        if (!req.query.code) {
            req.session.dsc_url = req.originalUrl
            if (!options.redirect_uri) return res.sendStatus(500)
            res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${options.client_id}&redirect_uri=${resolve(options.redirect_uri)}/discord/oauth2/&response_type=code&scope=identify%20email%20guilds`);
        }
    }

    req.discord.logout = () => req.session.dsc_user = null

    req.discord.user = (force = false) => {
        if (force) return new Promise(async (a)=> {
            req.session.dsc_user = await (await fetch('https://discord.com/api/users/@me', {headers: {'Authorization': `Bearer ${req.session.dsc_access_token}`}})).json()
            a(req.discord.user())
        })
        return req.session.dsc_user
    }

    req.discord.logged = () => !!(req.discord.user())

    req.discord.guilds = async () => await (await fetch('https://discord.com/api/users/@me/guilds', {headers: {'Authorization': `Bearer ${req.session.dsc_access_token}`}})).json()

    if (req.originalUrl.startsWith('/discord/oauth2/') && req.query.code) {
            if (!options.redirect_uri) return res.sendStatus(500)
            let f = await fetch('https://discord.com/api/oauth2/token',{
                method:'POST',
                body: new URLSearchParams({
                    client_id: options.client_id,
                    client_secret:options.client_secret,
                    code: req.query.code,
                    redirect_uri: `${resolve(options.redirect_uri)}/discord/oauth2/`,
                    grant_type: 'authorization_code',
                    scope: options.scope
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
            }})
            f = await f.json()
            let u = await fetch('https://discord.com/api/users/@me', {headers: {'Authorization': `Bearer ${f['access_token']}`}})
            let user = await u.json()
            if (user.message == '401: Unauthorized') return res.sendStatus(500)
            req.session.dsc_access_token = f['access_token']
            req.session.dsc_user = user
            res.redirect(req.session.dsc_url)
            return
    }
    if (req.discord.logged()) {
        if (!req.session.dsc_lastUserInfo) req.session.dsc_lastUserInfo = Date.now()
        if (Date.now() - req.session.dsc_lastUserInfo > 3600000) await req.discord.user(true)
    }
    next()
}

module.exports = (app) => {
    if (!app.csa) {
        app.use(require('cookie-session')({
            name: 'session',
            keys: genSession()
        }))
        app.csa = true
    }
    app.utils = {discord: {}}
    app.use(discord)
    return app
}