import { defineMiddleware } from 'astro:middleware'

const BASE = 'https://masterboard.com.br'

// go.masterboard.com.br/X → masterboard.com.br/destino
const GO: Record<string, string> = {
  '/instagram': '/aplicacao/?utm_source=instagram&utm_medium=social&utm_campaign=bio',
  '/ig':        '/aplicacao/?utm_source=instagram&utm_medium=social&utm_campaign=bio',
  '/whatsapp':  '/aplicacao/?utm_source=whatsapp&utm_medium=social',
  '/wa':        '/aplicacao/?utm_source=whatsapp&utm_medium=social',
  '/email':     '/aplicacao/?utm_source=email&utm_medium=email',
  '/linkedin':  '/aplicacao/?utm_source=linkedin&utm_medium=social',
  '/li':        '/aplicacao/?utm_source=linkedin&utm_medium=social',
  '/eventos':   '/eventos/?utm_source=go&utm_medium=link',
  '/':          '/aplicacao/',
}

export const onRequest = defineMiddleware((ctx, next) => {
  const host = ctx.request.headers.get('host') ?? ''

  if (host.startsWith('go.')) {
    const path = new URL(ctx.request.url).pathname.replace(/\/$/, '') || '/'
    const dest = GO[path]
    if (dest) return ctx.redirect(BASE + dest, 302)
    // fallback: manda pra home
    return ctx.redirect(BASE, 302)
  }

  return next()
})
