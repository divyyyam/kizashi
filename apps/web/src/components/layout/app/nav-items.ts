import { ChartSpline, Cpu, type LucideIcon, SquarePlus, WalletMinimal } from "lucide-react";
import { copy } from "@/content/copy";

export type NavItem = {
  readonly href: string;
  readonly label: string;
  readonly icon: LucideIcon;
  /** Second key of the "g then key" jump shortcut. */
  readonly key: string;
};

export type NavGroup = {
  readonly title: string;
  readonly items: readonly NavItem[];
};

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    title: copy.shell.groups.trade,
    items: [
      { href: "/markets", label: copy.shell.items.markets, icon: ChartSpline, key: "m" },
      { href: "/markets/new", label: copy.shell.items.create, icon: SquarePlus, key: "c" },
    ],
  },
  {
    title: copy.shell.groups.account,
    items: [
      { href: "/portfolio", label: copy.shell.items.portfolio, icon: WalletMinimal, key: "p" },
    ],
  },
  {
    title: copy.shell.groups.automate,
    items: [{ href: "/model", label: copy.shell.items.model, icon: Cpu, key: "e" }],
  },
];

export const NAV_ITEMS: readonly NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
