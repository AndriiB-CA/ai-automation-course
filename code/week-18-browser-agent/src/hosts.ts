/** Hosts the agent is allowed to open. Untrusted page content must not widen this. */

export function allowedHosts(): string[] {
  return (process.env.ALLOWED_HOSTS ?? "demo.playwright.dev")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
}

export function assertAllowed(url: string): void {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Not a URL: ${url}`);
  }
  if (!allowedHosts().includes(host)) {
    throw new Error(`Refusing ${host}. Add it to ALLOWED_HOSTS if you mean to visit it.`);
  }
}
