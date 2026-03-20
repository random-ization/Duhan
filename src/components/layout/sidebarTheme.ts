export interface SidebarThemeTokens {
  background: string;
  border: string;
  text: string;
  mutedText: string;
  surface: string;
  surfaceMuted: string;
  activeBackground: string;
  activeText: string;
  hoverBackground: string;
  hoverText: string;
  focusRing: string;
  successBackground: string;
  successText: string;
  destructiveHoverBackground: string;
  destructiveText: string;
  badgeBackground: string;
  badgeText: string;
}

const lightTokens: SidebarThemeTokens = {
  background: 'hsl(40 15% 97%)',
  border: 'hsl(214 26% 88% / 0.7)',
  text: 'hsl(215 28% 17%)',
  mutedText: 'hsl(215 16% 47%)',
  surface: 'hsl(0 0% 100%)',
  surfaceMuted: 'hsl(210 18% 95%)',
  activeBackground: 'hsl(224 100% 96%)',
  activeText: 'hsl(232 63% 43%)',
  hoverBackground: 'hsl(210 24% 94%)',
  hoverText: 'hsl(215 28% 17%)',
  focusRing: 'hsl(231 76% 57%)',
  successBackground: 'hsl(142 50% 93%)',
  successText: 'hsl(143 70% 28%)',
  destructiveHoverBackground: 'hsl(0 86% 96%)',
  destructiveText: 'hsl(0 70% 44%)',
  badgeBackground: 'hsl(25 95% 45%)',
  badgeText: 'hsl(0 0% 100%)',
};

const darkTokens: SidebarThemeTokens = {
  background: 'hsl(222 20% 10%)',
  border: 'hsl(218 16% 27% / 0.8)',
  text: 'hsl(210 35% 94%)',
  mutedText: 'hsl(216 15% 67%)',
  surface: 'hsl(222 20% 14%)',
  surfaceMuted: 'hsl(222 19% 18%)',
  activeBackground: 'hsl(229 55% 26%)',
  activeText: 'hsl(220 90% 85%)',
  hoverBackground: 'hsl(222 18% 22%)',
  hoverText: 'hsl(210 35% 95%)',
  focusRing: 'hsl(231 84% 72%)',
  successBackground: 'hsl(146 45% 21%)',
  successText: 'hsl(146 70% 76%)',
  destructiveHoverBackground: 'hsl(0 48% 20%)',
  destructiveText: 'hsl(0 88% 78%)',
  badgeBackground: 'hsl(27 88% 58%)',
  badgeText: 'hsl(223 40% 12%)',
};

export function getSidebarThemeTokens(resolvedTheme: 'light' | 'dark'): SidebarThemeTokens {
  return resolvedTheme === 'dark' ? darkTokens : lightTokens;
}
