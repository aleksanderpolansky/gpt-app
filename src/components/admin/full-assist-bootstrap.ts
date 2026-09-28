import { getFullAssistContext } from "../../../lib/auth0";
export async function getFullAssistBootstrap() {
  let context = null;
  let invalid = false;
  try { context = await getFullAssistContext(); } catch { invalid = true; }
  const marker = context?.sessionId ?? (invalid ? "invalid" : "none");
  // Bind requests to the identity with which THIS document was rendered, not to a mutable cookie.
  const source = `(() => {
    const marker = ${JSON.stringify(marker)};
    const originalFetch = window.fetch.bind(window);
    window.fetch = function(input, init) {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href);
      if (url.origin !== location.origin) return originalFetch(input, init);
      const headers = new Headers(init && init.headers || (input instanceof Request ? input.headers : undefined));
      headers.set('x-arctor-assist-context', marker);
      return originalFetch(input, Object.assign({}, init, { headers }));
    };
    const open = XMLHttpRequest.prototype.open, send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(method, url) {
      this.__arctorSameOrigin = new URL(String(url), location.href).origin === location.origin;
      return open.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function(body) {
      if (this.__arctorSameOrigin) this.setRequestHeader('x-arctor-assist-context', marker);
      return send.call(this, body);
    };
    window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
    window.addEventListener('storage', event => { if (event.key === 'arctor-assist-context-change-v2') location.reload(); });
  })();`;
  return { source, context: context ? { name: context.user.name || context.user.email || context.targetUserId, expiresAt: context.expiresAt } : null, invalid };
}
