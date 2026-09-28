/**
 * The sidebar is a light surface. It used to be a dark green panel, and every
 * part of it was built for that: white text, `white/10` hairlines, a
 * translucent-white profile card and a WHITE active-route bar.
 *
 * Turning the background white without touching those would not have looked
 * broken, it would have looked like the sidebar was empty — and the active bar
 * in particular would have vanished silently, so there was no way to tell which
 * page you were on. So the colour change is pinned here.
 *
 * These tests deliberately resolve the `--color-sidebar-*` tokens out of
 * index.css rather than hardcoding the hexes, so reverting the token OR
 * hardcoding a raw colour back into the component both fail. Asserting only
 * "the class is bg-sidebar-bg" would pass against a green token and prove
 * nothing about what a user sees.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const teamRoleState = {
  isOwner: true,
  teamRoles: ['admin'],
  permissions: ['*'],
  hasPermission: () => true,
};

vi.mock('@/hooks/useTeamRole', () => ({
  // Mutable, because the identity card renders different lines depending on who
  // is looking and whether the business has a verification record — and the
  // colour of each of those lines is exactly what this file is pinning.
  useTeamRole: () => teamRoleState,
}));

const businessProfile = {
  businessName: 'Expedition Go Tours Ltd',
  logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.png',
  status: 'ACTIVE',
  supplierSince: '2021-03-04T00:00:00.000Z',
};

vi.mock('@/features/auth/api', () => ({
  loadSupplierProfile: vi.fn(async () => businessProfile),
}));

vi.mock('@/lib/axios', () => ({
  default: { get: vi.fn(async () => ({ data: { data: {} } })) },
}));

import Sidebar from '../Sidebar';
import { useAuthStore } from '@/stores/authStore';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
const headerSource = readFileSync(
  resolve(process.cwd(), 'src/components/layout/Header.jsx'),
  'utf8',
);

/** Resolves a `--color-…: #hex;` declaration from the Tailwind v4 @theme block. */
function token(name) {
  const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!match) throw new Error(`no --color-${name} token in index.css`);
  return match[1].toLowerCase();
}

const hexToRgb = (hex) => {
  const full = hex.length === 4
    ? '#' + [...hex.slice(1)].map((c) => c + c).join('')
    : hex;
  return {
    r: parseInt(full.slice(1, 3), 16),
    g: parseInt(full.slice(3, 5), 16),
    b: parseInt(full.slice(5, 7), 16),
  };
};

/** Relative luminance, WCAG 2.x. Used to prove text is actually readable. */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const isWhite = (hex) => luminance(hex) > 0.9;

/**
 * Utility classes that only apply while a state is active. They must be ignored
 * when asking "what colour is this element at rest?" — otherwise
 * `hover:bg-red-50` reads as the element having a dark background, and a
 * `text-white` label resting on white sails straight through.
 */
const RESTING = (el) =>
  // getAttribute, not el.className: the sidebar's icons are SVG elements, whose
  // className is an SVGAnimatedString and has no .split.
  (el.getAttribute('class') || '')
    .split(/\s+/)
    .filter((c) => c && !/^(hover|focus|active|group-hover|focus-visible|disabled):/.test(c));

const hasOwnBackground = (el) => RESTING(el).some((c) => /^bg-(?!white|transparent|black$)/.test(c));

/** Every element the sidebar paints, including the sidebar's own surface. */
function sidebarElements(container) {
  const aside = container.querySelector('aside');
  return [aside, ...aside.querySelectorAll('*')].filter(Boolean);
}

function renderSidebar(path = '/products') {
  return render(<MemoryRouter initialEntries={[path]}><Sidebar /></MemoryRouter>);
}

/**
 * A team member looking at a business with no verification record. This is the
 * state that renders the "Administrator" fallback and the team-role line — two
 * more labels that used to be `text-white/40`, and neither of which exists in
 * the owner's verified view, so the default render cannot see them.
 */
async function renderAsUnverifiedMember() {
  businessProfile.status = null;
  teamRoleState.isOwner = false;
  teamRoleState.teamRoles = ['editor'];
  useAuthStore.setState({
    user: { id: 'u-2', name: 'Ama Boateng', email: 'member@example.com', roles: ['customer'], createdAt: '2024-01-01' },
    supplierProfile: { businessInfo: { legalBusinessName: 'Expedition Go Tours Ltd' }, createdAt: '2021-03-04T00:00:00.000Z' },
  });
  const utils = render(<MemoryRouter initialEntries={['/products']}><Sidebar /></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('Administrator')).toBeTruthy());
  return utils;
}

beforeEach(() => {
  vi.clearAllMocks();
  businessProfile.status = 'ACTIVE';
  teamRoleState.isOwner = true;
  teamRoleState.teamRoles = ['admin'];
  teamRoleState.permissions = ['*'];
  teamRoleState.hasPermission = () => true;
  useAuthStore.setState({
    user: { id: 'u-1', name: 'Gideon Kwarteng', email: 'owner@example.com', roles: ['supplier'], createdAt: '2024-01-01' },
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    supplierProfile: { status: 'ACTIVE' },
  });
});

describe('sidebar surface matches the header', () => {
  it('is white, the same colour the header paints itself', () => {
    // The header's own class, read from its source rather than remembered.
    expect(headerSource).toMatch(/<header[\s\S]{0,200}?\bbg-white\b/);

    expect(token('sidebar-bg')).toBe('#ffffff');
  });

  it('is actually painted with the token, rather than a colour hardcoded in the component', async () => {
    // The three sidebar tokens existed for years and were referenced by nothing:
    // the component hardcoded `bg-[#065f46]`. Asserting only the token's value
    // would pass happily while the sidebar stayed green, because the two are
    // independent — so the link between them is what this pins.
    const { container } = renderSidebar();
    await waitFor(() => expect(screen.getByText('Bookings')).toBeTruthy());

    const aside = container.querySelector('aside');
    expect(aside.className).toContain('bg-sidebar-bg');
    expect(aside.className).toContain('border-sidebar-border');
    expect(aside.className).not.toMatch(/\[#065f46\]/);
  });

  it('separates from the header with the same hairline the header uses below itself', () => {
    expect(headerSource).toMatch(/border-b border-\[#eaeaea\]/);
    // The seam between two white panels is the only thing marking where one
    // ends and the other begins, so the two hairlines have to be one colour.
    expect(token('sidebar-border')).toBe('#eaeaea');
    expect(token('border')).toBe('#eaeaea');
  });
});

describe('sidebar navigation items', () => {
  it('paints their text near-black rather than white', async () => {
    renderSidebar();
    await waitFor(() => expect(screen.getByText('Bookings')).toBeTruthy());

    // "Bookings" is not the current route, so this is the resting appearance
    // every item has for the whole time you are not on it.
    const resting = screen.getByText('Bookings').closest('a');
    expect(resting.getAttribute('aria-current')).toBeNull();
    expect(resting.className).toContain('text-sidebar-text');

    // Not merely "not the white it used to be" — dark enough to read.
    expect(isWhite(token('sidebar-text'))).toBe(false);
    expect(contrast(token('sidebar-text'), token('sidebar-bg'))).toBeGreaterThan(7);
  });

  it('highlights on hover with the light green, not a translucent white', async () => {
    renderSidebar();
    await waitFor(() => expect(screen.getByText('Bookings')).toBeTruthy());

    const resting = screen.getByText('Bookings').closest('a');
    expect(resting.getAttribute('aria-current')).toBeNull();
    expect(resting.className).toMatch(/hover:bg-sidebar-hover/);

    const hover = token('sidebar-hover');
    expect(hover).toBe('#f0fdf4');
    // A highlight you cannot see is not a highlight: it has to be a different
    // colour from the surface behind it, and it still has to carry the text.
    expect(hover).not.toBe(token('sidebar-bg'));
    expect(contrast(token('sidebar-text'), hover)).toBeGreaterThan(7);
  });

  it('keeps every item at medium weight, so the active one is not the only bold row', async () => {
    const { container } = renderSidebar();
    await waitFor(() => expect(screen.getByText('Products')).toBeTruthy());

    const links = [...container.querySelectorAll('nav a')];
    expect(links.length).toBeGreaterThan(5);
    for (const link of links) {
      expect(link.className).toContain('font-medium');
      expect(link.className).not.toContain('font-semibold');
    }
  });

  it('still marks the current route with a bar that is visible on a white sidebar', async () => {
    const { container } = renderSidebar('/products');
    await waitFor(() => expect(screen.getByText('Products')).toBeTruthy());

    const current = screen.getByText('Products').closest('a');
    expect(current.getAttribute('aria-current')).toBe('page');

    const bar = container.querySelector('nav a span.absolute.left-0');
    expect(bar).toBeTruthy();
    // The regression this whole change is about: the bar was `bg-white`.
    expect(bar.className).not.toContain('bg-white');
    expect(bar.className).toContain('bg-sidebar-active');
    expect(isWhite(token('sidebar-active'))).toBe(false);

    // And the row itself has to read as current too, not just the 5px bar.
    expect(current.className).toContain('bg-sidebar-hover');
    expect(current.className).toContain('text-sidebar-active');
    expect(contrast(token('sidebar-active'), token('sidebar-hover'))).toBeGreaterThan(4.5);
  });
});

describe('no white-on-white survives the theme change', () => {
  it('has no element painting text white onto a surface that is not itself dark', async () => {
    const { container } = renderSidebar();
    await waitFor(() => expect(screen.getByText('Products')).toBeTruthy());

    const offenders = sidebarElements(container).filter((el) => {
      if (!RESTING(el).some((c) => /^text-white(\/.*)?$/.test(c))) return false;
      // White text is only legitimate when the element supplies its own dark
      // background at rest — e.g. the red button in the sign-out confirmation
      // popover, which is `text-white bg-red-500`.
      return !hasOwnBackground(el);
    });

    expect(offenders.map((el) => el.getAttribute('class'))).toEqual([]);
  });

  it('leaves no translucent-white surface that would read as an empty box', async () => {
    const { container } = renderSidebar();
    await waitFor(() => expect(screen.getByText('Products')).toBeTruthy());

    // `bg-white/15`, `border-white/10`, `ring-white/20` and the arbitrary-value
    // form `bg-white/[0.06]` were all sized for a dark panel: on white they
    // contribute nothing and the element loses its edge. The two that
    // legitimately survive are the floating popovers, which sit over the page
    // content rather than over the sidebar.
    const offenders = sidebarElements(container).filter((el) =>
      // Matches both `white/15` and `white/[0.06]`.
      RESTING(el).some((c) => /^(?:bg|border|ring)-white(?:\/\d+|\/\[[^\]]*\])/.test(c)),
    );
    expect(offenders.map((el) => el.getAttribute('class'))).toEqual([]);
  });

  it('renders the status label and the business name in readable colours', async () => {
    renderSidebar();
    // "Verified" for an ACTIVE business, plus the business name.
    await waitFor(() => expect(screen.getByText('Verified')).toBeTruthy());

    expect(screen.getByText('Verified').className).not.toContain('text-white');
    expect(screen.getByText('Expedition Go Tours Ltd').className).toContain('text-sidebar-text');
  });

  it('covers the identity lines a member sees, which the owner view never renders', async () => {
    const { container } = await renderAsUnverifiedMember();

    // "Administrator" (no verification record) and the member's team role both
    // used to be `text-white/40`. Asserting them only in the owner's verified
    // view — where neither exists — would have let both regress unnoticed.
    expect(screen.getByText('Administrator').className).toContain('text-sidebar-muted');
    const roleLine = screen.getByText('Editor');
    expect(roleLine.className).toContain('text-sidebar-muted');
    expect(contrast(token('sidebar-muted'), token('sidebar-bg'))).toBeGreaterThan(4.5);

    const offenders = sidebarElements(container).filter((el) =>
      RESTING(el).some((c) => /^text-white(\/.*)?$/.test(c)),
    );
    expect(offenders.map((el) => el.getAttribute('class'))).toEqual([]);
  });
});

describe('the dormant branches of the sidebar', () => {
  /**
   * The DOM scans above only see what renders. No nav item currently sets
   * `disabled`, so the "coming soon" button never mounts and its colour cannot
   * be checked by rendering anything — reverting it to `text-white/30` left
   * every other test green. Reading the source covers the branches that exist
   * but are not currently reachable, which is exactly the kind of thing that
   * comes back the moment a nav item is disabled again.
   */
  it('leaves no white-on-white utility anywhere in the sidebar source, comments aside', () => {
    const code = readFileSync(resolve(process.cwd(), 'src/components/layout/Sidebar.jsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|\s)\/\/.*$/gm, '$1');

    const lines = code.split('\n');

    // Translucent white: bg-white/15, border-white/10, ring-white/20, and the
    // arbitrary form bg-white/[0.06]. None of these mean anything on white.
    const translucent = lines.filter((l) => /(?:bg|border|ring)-white(?:\/\d+|\/\[[^\]]*\])/.test(l));
    expect(translucent).toEqual([]);

    // White text, with or without an opacity suffix. The one legitimate use is
    // the red button in the sign-out confirmation, where white-on-red is right.
    const whiteText = lines.filter(
      (l) => /\btext-white(?:\/\d+|\/\[[^\]]*\])?\b/.test(l) && !/\bbg-red-/.test(l),
    );
    expect(whiteText).toEqual([]);
  });
});
