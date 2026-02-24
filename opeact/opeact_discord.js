// Discord Oauth2 For Opeact >=2.9

import fs from 'fs'
import crypto from 'crypto'
import cookieSession from 'cookie-session'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

const resolve = (str) => str.endsWith('/') ? str.slice(0,str.length - 1) : str

const genKey = (length) => {
    return crypto.randomBytes(length).toString('hex')
}

const genSession = () => {
    if (!fs.existsSync(__dirname + '/opeact_session.key')) fs.writeFileSync(__dirname + '/opeact_session.key',`${genKey(64)},${genKey(64)}`)
    return fs.readFileSync(__dirname + '/opeact_session.key','utf8').split(',')
}

const DiscordMiddleware = (req, res, next) => {
    req.discord = {}

    req.discord.logout = () => {
        req.session.dsc_user = null
        req.session.dsc_access_token = null
    }

    const user = req.session.dsc_user || null
    req.discord.user = user

    req.discord.logged = !!(user)

    next()
}

const DiscordOAuth = (options) => {
    return async (req, res) => {
        const action = req.params.action

        if (action === 'login') {
            const returnUrl = req.query.return || '/'
            if (returnUrl && !returnUrl.startsWith('/')) {
                return res.status(400).send('Invalid return URL')
            }
            req.session.dsc_oauth2_return = returnUrl || '/'
            req.session.dsc_oauth2_lastRequest = Date.now()
            res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${options.client_id}&redirect_uri=${resolve(options.redirect_uri)}/discord/oauth2/result&response_type=code&scope=${options.scope}`);
            return
        }

        if (action === 'result') {
            if (!req.session.dsc_oauth2_lastRequest || (Date.now() - req.session.dsc_oauth2_lastRequest) > 10 * 60 * 1000) {
                return res.status(400).send('OAuth2 session expired. Please try logging in again.')
            }

            const code = req.query.code
            if (!code) return res.status(400).send('No code provided')

            const response = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                body: new URLSearchParams({
                    client_id: options.client_id,
                    client_secret: options.client_secret,
                    code: req.query.code,
                    redirect_uri: `${resolve(options.redirect_uri)}/discord/oauth2/result`,
                    grant_type: 'authorization_code',
                    scope: options.scope
                }),
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }).catch(() => null)

            if (!response || !response.ok) {
                return res.status(400).send(`An error occurred trying to log-in. Please try again later.`)
            }

            const data = await response.json()

            if (!data.access_token) {
                return res.status(400).send(`An error occurred trying to log-in. Please try again later.`)
            }

            const accessToken = data['access_token']

            const userResponse = await fetch('https://discord.com/api/users/@me', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            }).catch(() => null)

            if (!userResponse || !userResponse.ok) {
                return res.status(400).send(`An error occurred trying to log-in. Please try again later.`)
            }

            const user = await userResponse.json()

            if (!user || !user.id) {
                return res.status(400).send(`An error occurred trying to log-in. Please try again later.`)
            }

            req.session.dsc_access_token = accessToken
            req.session.dsc_user = user

            const redirectUrl = req.session.dsc_oauth2_return || '/'
            delete req.session.dsc_oauth2_return
            delete req.session.dsc_oauth2_lastRequest
            res.redirect(redirectUrl)
            return
        }

        if (action === 'logout') {
            req.session.dsc_user = null
            req.session.dsc_access_token = null
            const redirectUrl = req.query.return || '/'
            if (redirectUrl && !redirectUrl.startsWith('/')) {
                return res.status(400).send('Invalid return URL')
            }
            res.redirect(redirectUrl)
            return
        }
    }
}

export default (options) => {
    if (!options) throw new Error('Discord options are required')
    if (!options.client_id) throw new Error('Discord client_id is required')
    if (!options.client_secret) throw new Error('Discord client_secret is required')
    if (!options.redirect_uri) throw new Error('Discord redirect_uri is required')
    if (!options.grant_type) options.grant_type = 'authorization_code'
    if (!options.scope) {
        console.warn('No Discord scope provided, defaulting to "identify email"')
        options.scope = 'identify email'
    }
    return (app) => {
        if (!app.csa) {
            app.use(cookieSession({
                name: 'session',
                keys: genSession(),
                maxAge: 7 * 24 * 60 * 60 * 1000
            }))
            app.csa = true
        }
        app.opeact_utils.discord = options || {}
        app.get('/discord/oauth2/:action', DiscordOAuth(options))
        app.use(DiscordMiddleware)
        return app
    }
}