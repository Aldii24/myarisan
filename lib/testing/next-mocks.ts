// Test-only helpers. Not imported by application code.
//
// Stand-ins for the Next.js server APIs the auth/access-control code depends on:
// `redirect()` from next/navigation and `cookies()` from next/headers.

// next/navigation's redirect() throws internally to halt rendering. The fake
// mirrors that contract so tests can assert "this guard redirected to X".
export class RedirectError extends Error {
  readonly digest: string;

  constructor(readonly location: string) {
    super(`NEXT_REDIRECT:${location}`);
    this.name = "RedirectError";
    this.digest = `NEXT_REDIRECT;replace;${location};`;
  }
}

export function fakeRedirect(location: string): never {
  throw new RedirectError(location);
}

export function isRedirectTo(error: unknown, location: string) {
  return error instanceof RedirectError && error.location === location;
}

// Minimal in-memory cookie jar matching the subset of the Next.js cookies()
// API the session module uses: get / set / delete.
export function createCookieJar(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));

  const jar = {
    delete: (name: string) => {
      store.delete(name);
    },
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      store.set(name, value);
    },
    store,
  };

  return jar;
}
