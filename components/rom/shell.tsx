'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
// Full page links initialize URL state; logo/QR URLs are served directly without an image proxy.
/* eslint-disable nextjs/no-html-link-for-pages, nextjs/no-img-element */
import { useEffect, useState, type ReactNode } from 'react';
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
export const navigation = [
  { id: 'archive', label: 'Kho phần mềm', icon: Grid2X2 },
  { id: 'recovery', label: 'Recovery / OFOX', icon: ShieldCheck },
  { id: 'ota', label: 'Firmware OTA', icon: Layers3 },
  { id: 'mirrors', label: 'SourceForge', icon: Globe },
  { id: 'stats', label: 'Máy chủ tải', icon: Activity },
  { id: 'changelog', label: 'Changelog', icon: History },
];
export function Shell({
  children,
  active = 'archive',
  name = 'Kho ROM Việt',
  logo,
  accent,
  sections,
  groups = [],
  donate = false,
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
        .filter(Boolean)
    : navigation;
  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': '242px',
          ...(accent ? { '--brand': accent, '--primary': accent } : {}),
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
          <div className="nav-label">Thư viện</div>
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
                    {n.label}
                    {n.id === 'stats' && <span className="status-dot" />}
                  </a>
                ),
            )}
          </nav>
          {groups.length > 0 && (
            <>
              <div className="nav-label spaced">Cộng đồng</div>
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
          {donate && (
            <a className="nav-link" href="/?view=donate">
              <Heart size={18} />
              Ủng hộ
            </a>
          )}
        </SidebarContent>
        <SidebarFooter className="nav-footer">
          <div className="source-label">
            <span className="status-dot" /> Kho dữ liệu cộng đồng
          </div>
          <p>File tải từ máy chủ nguồn.</p>
          <a href="/admin" className={`admin-link ${admin ? 'text-link' : ''}`}>
            <ShieldCheck size={16} /> Quản trị
          </a>
        </SidebarFooter>
      </Sidebar>
      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-start">
            <SidebarTrigger
              className="mobile-menu"
              aria-label="Mở điều hướng"
            >
              <Menu size={20} />
            </SidebarTrigger>
            <span className="topbar-label">
              {admin ? 'Không gian quản trị' : 'Kho phần mềm & firmware'}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="language-tag">Tiếng Việt</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                dark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'
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
          <span>
            ROM Archive ·{' '}
            <a
              href="https://roms.danielspringer.at/"
              target="_blank"
              rel="noreferrer"
            >
              Daniel Springer <ArrowUpRight size={12} />
            </a>
          </span>
        </footer>
      </div>
    </SidebarProvider>
  );
}
