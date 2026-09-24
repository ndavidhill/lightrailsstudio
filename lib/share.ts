/* Looks travel in the URL hash as base64url JSON of only the settings that
   differ from DEFAULTS, so links stay short: #c=eyJzaGFwZSI6MjV9 */
import { Config, DEFAULTS, coerceConfig } from "./config";

export function encodeConfig(c: Config): string {
  const diff: Record<string, unknown> = {};
  for (const k of Object.keys(c) as (keyof Config)[]) {
    if (JSON.stringify(c[k]) !== JSON.stringify(DEFAULTS[k])) diff[k] = c[k];
  }
  let bin = "";
  new TextEncoder().encode(JSON.stringify(diff)).forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeConfig(s: string): Config | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
    return coerceConfig(JSON.parse(json));
  } catch {
    return null;
  }
}

/* the look in a location hash, if there is one */
export function configFromHash(hash: string): Config | null {
  const m = /[#&]c=([A-Za-z0-9_-]+)/.exec(hash);
  return m ? decodeConfig(m[1]) : null;
}

export function shareUrl(c: Config, path: string): string {
  return `${window.location.origin}${path}#c=${encodeConfig(c)}`;
}

export function embedCode(c: Config): string {
  return `<iframe src="${shareUrl(c, "/embed")}" title="Light Rails pattern" style="border:0;width:100%;height:100%;display:block" loading="lazy"></iframe>`;
}
