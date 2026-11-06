type Routed = { readonly href: string };

const matches = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

/**
 * The single item a path belongs to: the longest matching href wins, so `/markets/new` selects
 * "Create market" while `/markets/0x…` keeps "Markets".
 */
export function activeItem<T extends Routed>(items: readonly T[], pathname: string): T | undefined {
  let best: T | undefined;
  for (const item of items) {
    if (matches(pathname, item.href) && item.href.length > (best?.href.length ?? -1)) best = item;
  }
  return best;
}
