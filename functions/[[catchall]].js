// SPA fallback — serve index.html for paths that don't match a static asset or API route
export async function onRequest(context) {
  const url = new URL(context.request.url)
  url.pathname = '/index.html'
  return context.env.ASSETS.fetch(new URL(url))
}
