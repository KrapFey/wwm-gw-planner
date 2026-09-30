// Short, URL-safe ids for players / squads / markers. getRandomValues (not
// randomUUID) so it also works over plain-http LAN dev (insecure context).
export const newId = (prefix) =>
  `${prefix}_${Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join('')}`
