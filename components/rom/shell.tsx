'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
// Full page links initialize URL state; logo/QR URLs are served directly without an image proxy.
/* eslint-disable nextjs/no-html-link-for-pages, nextjs/no-img-element */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Grid2X2,
  ShieldCheck,
  Layers3,
  Globe,
  Activity,
  History,
  Heart,
  Moon,
  Sun,
  ArrowUpRight,
  Menu,
  Smartphone,
  Terminal,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/language';
const SmartphoneIcon = Smartphone;
export const navigation = [
  { id: 'archive', label: 'Kho phần mềm', icon: Grid2X2, hidden: false },
  {
    id: 'xiaomi',
    label: 'Xiaomi / HyperOS',
    icon: SmartphoneIcon,
    hidden: true,
  },
  {
    id: 'recovery',
    label: 'Recovery / OFOX',
    icon: ShieldCheck,
    hidden: false,
  },
  { id: 'ota', label: 'Firmware OTA', icon: Layers3, hidden: false },
  { id: 'root-guide', label: 'Root Guide', icon: Terminal, hidden: false },
  { id: 'mirrors', label: 'SourceForge', icon: Globe, hidden: false },
  { id: 'stats', label: 'Máy chủ tải', icon: Activity, hidden: false },
  { id: 'changelog', label: 'Changelog', icon: History, hidden: false },
];
export function Shell({
  children,
  active = 'archive',
  name = 'Kho ROM Việt',
  logo,
  accent,
  sections,
  groups = [],
  donate = true,
  admin = false,
}: {
  children: ReactNode;
  active?: string;
  name?: string;
  logo?: string;
  accent?: string;
  sections?: { id: string; enabled: boolean; order: number }[];
  groups?: { name: string; url: string }[];
  donate?: boolean;
  admin?: boolean;
}) {
  const [dark, setDark] = useState(false);
  const { language, setLanguage } = useLanguage();
  useEffect(() => {
    setDark(localStorage.getItem('rom-theme') === 'dark');
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const links = sections
    ? sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.order - b.order)
        .map((s) => navigation.find((n) => n.id === s.id))
        .filter((n) => n && !n.hidden)
        .filter(Boolean)
    : navigation;
  const labels = useMemo(
    () =>
      language === 'en'
        ? {
            library: 'Library',
            recovery: 'Recovery / OFOX',
            ota: 'Firmware OTA',
            root: 'Root Guide',
            mirrors: 'SourceForge',
            stats: 'Download Server',
            changelog: 'Changelog',
            donate: 'Support',
            community: 'Community',
            source: 'Community data source',
            sourceDesc: 'Files served from the source server.',
            admin: 'Private workspace',
            adminBar: 'Admin workspace',
            appBar: 'Software & firmware library',
            language: 'English',
            light: 'Switch to light theme',
            dark: 'Switch to dark theme',
          }
        : {
            library: 'Kho phần mềm',
            recovery: 'Recovery / OFOX',
            ota: 'Firmware OTA',
            root: 'Root Guide',
            mirrors: 'SourceForge',
            stats: 'Máy chủ tải',
            changelog: 'Changelog',
            donate: 'Ủng hộ',
            community: 'Cộng đồng',
            source: 'Kho dữ liệu cộng đồng',
            sourceDesc: 'File tải từ máy chủ nguồn.',
            admin: 'Không gian riêng tư',
            adminBar: 'Không gian quản trị',
            appBar: 'Kho phần mềm & firmware',
            language: 'Tiếng Việt',
            light: 'Chuyển giao diện sáng',
            dark: 'Chuyển giao diện tối',
          },
    [language],
  );
  const translatedLabel = (id: string, fallback: string) =>
    ({
      archive: labels.library,
      recovery: labels.recovery,
      ota: labels.ota,
      'root-guide': labels.root,
      mirrors: labels.mirrors,
      stats: labels.stats,
      changelog: labels.changelog,
    })[id] || fallback;
  const toggleLanguage = () => {
    const next = language === 'vi' ? 'en' : 'vi';
    localStorage.setItem('rom-language', next);
    setLanguage(next);
  };
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '242px',
          ...(accent && !(dark && accent.toLowerCase() === '#007aff')
            ? { '--brand': accent, '--primary': accent }
            : {}),
        } as React.CSSProperties
      }
      className="rom-app"
      >
      <Sidebar variant="inset" className="rom-sidebar">
        <SidebarHeader className="brand-header">
          <a href="/" className="brand">
            <img src={logo || '/logo.png'} alt="" className="brand-logo" />
            <span>
              {name}
              <small>Phần mềm & firmware</small>
            </span>
          </a>
        </SidebarHeader>
        <SidebarContent className="nav-content">
          <div className="nav-label">{language === 'en' ? 'Library' : 'Thư viện'}</div>
          <nav>
            {links.map(
              (n) =>
                n && (
                  <a
                    key={n.id}
                    className={`nav-link ${active === n.id && !admin ? 'active' : ''}`}
                    href={`/?view=${n.id}`}
                  >
                    <n.icon size={18} />
                    {translatedLabel(n.id, n.label)}
                    {n.id === 'stats' && <span className="status-dot" />}
                  </a>
                ),
            )}
            {donate && (
              <a
                className={`nav-link ${active === 'donate' && !admin ? 'active' : ''}`}
                href="/?view=donate"
              >
                <Heart size={18} />
                {labels.donate}
              </a>
            )}
          </nav>
          {groups.length > 0 && (
            <>
              <div className="nav-label spaced">{labels.community}</div>
              {groups.map((g, i) => (
                <a
                  className="nav-link"
                  href={g.url}
                  target="_blank"
                  rel="noreferrer"
                  key={i}
                >
                  {g.name}
                  <ArrowUpRight size={15} />
                </a>
              ))}
            </>
          )}
        </SidebarContent>
        <SidebarFooter className="nav-footer">
          <div className="source-label">
            <span className="status-dot" /> {labels.source}
          </div>
          <p>{labels.sourceDesc}</p>
          {admin && (
            <span className="admin-link text-link">
              <ShieldCheck size={16} /> {labels.admin}
            </span>
          )}
        </SidebarFooter>
      </Sidebar>
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-start">
            <SidebarTrigger className="mobile-menu" aria-label="Mở điều hướng">
              <Menu size={20} />
            </SidebarTrigger>
            <span className="topbar-label">
              {admin ? labels.adminBar : labels.appBar}
            </span>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="language-switcher"
              onClick={toggleLanguage}
              aria-label={
                language === 'vi'
                  ? 'Switch language to English'
                  : 'Chuyển ngôn ngữ sang tiếng Việt'
              }
              title={
                language === 'vi'
                  ? 'Switch to English'
                  : 'Chuyển sang tiếng Việt'
              }
            >
              <span className={language === 'vi' ? 'active' : ''}>VI</span>
              <span className="language-divider">/</span>
              <span className={language === 'en' ? 'active' : ''}>EN</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                dark ? labels.light : labels.dark
              }
              onClick={() => {
                localStorage.setItem('rom-theme', dark ? 'light' : 'dark');
                setDark(!dark);
              }}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </Button>
          </div>
        </header>
        <main className="main-content">{children}</main>
        <footer className="page-footer">
          <span>{name}</span>
          <span>ROM Archive</span>
        </footer>
      </div>
    </SidebarProvider>
  );
}
