// Middleware: runs for all Function-routed requests
// For API routes, pass through to the specific function
// For everything else, serve index.html (SPA fallback)
export async function onRequest(context) {
  const url = new URL(context.request.url)

  // Let API routes pass through to their specific handlers
  if (url.pathname.startsWith('/api/')) {
    return context.next()
  }

  // SPA fallback — serve index.html
  url.pathname = '/index.html'
  return context.env.ASSETS.fetch(new URL(url))
}
