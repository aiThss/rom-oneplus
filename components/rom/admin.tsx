'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
// Full page links initialize URL state; logo/QR URLs are served directly without an image proxy.
/* eslint-disable nextjs/no-html-link-for-pages, nextjs/no-img-element */
import { useEffect, useState, type ReactNode } from 'react';
import {
  HardDrive,
  LockKeyhole,
  ArrowUpRight,
  Save,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  RotateCcw,
  Folder,
  ChevronRight,
  ArrowLeft,
  LogOut,
  Settings2,
  FilePenLine,
} from 'lucide-react';
import { Shell, navigation } from './shell';
import {
  api,
  useRemote,
  ErrorState,
  Loading,
  SelectField,
  timeLabel,
} from './common';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  defaultSettings,
  displayName,
  type Settings,
  type Override,
  type Entry,
  type SiteLog,
  type Cached,
  type Catalog,
} from '@/lib/model';
type AdminData = {
  settings: Settings;
  overrides: Override[];
  customs: Entry[];
  logs: SiteLog[];
  cache: {
    key: string;
    source_url: string;
    updated_at: number;
    attempted_at: number;
    error: string | null;
  }[];
};
export function Admin() {
  const auth = useRemote<{ authenticated: boolean; initialized: boolean }>(
    '/api/auth',
  );
  if (auth.loading)
    return (
      <Shell admin>
        <Loading />
      </Shell>
    );
  if (auth.error)
    return (
      <Shell admin>
        <ErrorState error={auth.error} retry={auth.reload} />
      </Shell>
    );
  return auth.data?.authenticated ? (
    <Dashboard onLogout={auth.reload} />
  ) : (
    <Login initialized={!!auth.data?.initialized} onLogin={auth.reload} />
  );
}
function Login({
  initialized,
  onLogin,
}: {
  initialized: boolean;
  onLogin: () => void;
}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Shell admin>
      <div className="login-layout">
        <div className="panel login-card">
          <span className="login-icon">
            <LockKeyhole size={28} />
          </span>
          <div className="eyebrow">KHÔNG GIAN QUẢN TRỊ</div>
          <h1>
            Chào mừng trở lại<span>.</span>
          </h1>
          <p>Đăng nhập để quản lý thư viện của bạn.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await api('/api/auth/login', { username, password });
                setPassword('');
                onLogin();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Tên đăng nhập">
              <Input
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Field>
            <Field label="Mật khẩu">
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Field>
            {error && (
              <p role="alert" className="field-error">
                {error}
              </p>
            )}
            {!initialized && (
              <p className="field-error">
                Chưa thiết lập tài khoản quản trị trên máy chủ.
              </p>
            )}
            <Button
              type="submit"
              className="action login-submit"
              disabled={busy || !initialized}
            >
              {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
              <ArrowUpRight size={16} />
            </Button>
          </form>
          <a href="/" className="text-link">
            <ArrowLeft size={14} />
            Về kho phần mềm
          </a>
        </div>
      </div>
    </Shell>
  );
}
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </label>
  );
}
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const state = useRemote<AdminData>('/api/admin/data');
  const [draft, setDraft] = useState<Settings>(defaultSettings);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (state.data) setDraft(structuredClone(state.data.settings));
  }, [state.data]);
  async function act(
    job: () => Promise<unknown>,
    message = 'Đã lưu thay đổi.',
  ) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await job();
      setNotice(message);
      state.reload();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell admin {...(state.data?.settings || defaultSettings)} donate={false}>
      <div className="page-heading admin-heading">
        <div>
          <div className="eyebrow">KHÔNG GIAN QUẢN TRỊ</div>
          <h1>
            Thư viện của bạn<span>.</span>
          </h1>
          <p>Nội dung, nhận diện và kết nối dữ liệu.</p>
        </div>
        <div className="action-row">
          <a className="action secondary-action" href="/" target="_blank">
            Xem website
            <ArrowUpRight size={15} />
          </a>
          <Button
            variant="ghost"
            className="action"
            onClick={async () => {
              await api('/api/auth/logout', {});
              onLogout();
            }}
          >
            <LogOut size={16} />
            Đăng xuất
          </Button>
        </div>
      </div>
      {state.loading && !state.data ? (
        <Loading />
      ) : state.error ? (
        <ErrorState error={state.error} retry={state.reload} />
      ) : (
        state.data && (
          <>
            <div aria-live="polite">
              {notice && <p className="notice success">{notice}</p>}
              {error && <ErrorState error={error} />}
            </div>
            <Tabs defaultValue="settings" className="admin-tabs">
              <TabsList className="admin-tabs-list">
                <TabsTrigger value="settings">Nhận diện</TabsTrigger>
                <TabsTrigger value="catalog">Danh mục nguồn</TabsTrigger>
                <TabsTrigger value="custom">Liên kết riêng</TabsTrigger>
                <TabsTrigger value="journal">Changelog web</TabsTrigger>
                <TabsTrigger value="sync">Đồng bộ</TabsTrigger>
              </TabsList>
              <TabsContent value="settings">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(() => api('/api/admin/settings', draft));
                  }}
                >
                  <div className="admin-columns">
                    <div className="panel admin-panel">
                      <div className="panel-heading">
                        <Settings2 size={20} />
                        <h2>Nhận diện website</h2>
                      </div>
                      <Field label="Tên website">
                        <Input
                          value={draft.name}
                          maxLength={60}
                          onChange={(e) =>
                            setDraft({ ...draft, name: e.target.value })
                          }
                          required
                        />
                      </Field>
                      <Field label="Màu điểm nhấn">
                        <div className="color-field">
                          <Input
                            type="color"
                            value={draft.accent}
                            onChange={(e) =>
                              setDraft({ ...draft, accent: e.target.value })
                            }
                          />
                          <Input
                            value={draft.accent}
                            pattern="#[a-fA-F0-9]{6}"
                            onChange={(e) =>
                              setDraft({ ...draft, accent: e.target.value })
                            }
                          />
                        </div>
                      </Field>
                      <ImageField
                        label="Logo"
                        value={draft.logo}
                        onChange={(logo) => setDraft({ ...draft, logo })}
                      />
                      <div
                        className="brand-preview"
                        style={{ borderColor: draft.accent }}
                      >
                        {draft.logo ? (
                          <img src={draft.logo} alt="Logo xem trước" />
                        ) : (
                          <span style={{ background: draft.accent }}>
                            <HardDrive size={25} />
                          </span>
                        )}
                        <div>
                          <h3>{draft.name || 'Tên website'}</h3>
                          <p>ROM, firmware & recovery</p>
                        </div>
                      </div>
                    </div>
                    <div className="panel admin-panel">
                      <div className="panel-heading">
                        <Folder size={20} />
                        <h2>Điều hướng</h2>
                      </div>
                      <p className="panel-caption">
                        Bật, tắt và sắp xếp các mục trên website.
                      </p>
                      {draft.sections
                        .sort((a, b) => a.order - b.order)
                        .map((s, i) => (
                          <div className="ordered-row" key={s.id}>
                            <Toggle
                              label={
                                navigation.find((n) => n.id === s.id)?.label ||
                                s.id
                              }
                              checked={s.enabled}
                              onChange={(enabled) =>
                                setDraft({
                                  ...draft,
                                  sections: draft.sections.map((v) =>
                                    v.id === s.id ? { ...v, enabled } : v,
                                  ),
                                })
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={'Đưa lên ' + s.id}
                              disabled={i === 0}
                              onClick={() => {
                                const arr = [...draft.sections];
                                [arr[i], arr[i - 1]] = [arr[i - 1], arr[i]];
                                setDraft({
                                  ...draft,
                                  sections: arr.map((v, order) => ({
                                    ...v,
                                    order,
                                  })),
                                });
                              }}
                            >
                              <ArrowUp size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={'Đưa xuống ' + s.id}
                              disabled={i === draft.sections.length - 1}
                              onClick={() => {
                                const arr = [...draft.sections];
                                [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                                setDraft({
                                  ...draft,
                                  sections: arr.map((v, order) => ({
                                    ...v,
                                    order,
                                  })),
                                });
                              }}
                            >
                              <ArrowDown size={14} />
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="admin-columns">
                    <div className="panel admin-panel">
                      <h2>Hãng & thiết bị</h2>
                      <p className="panel-caption">
                        OnePlus được bật mặc định. Các hãng khác áp dụng cho cả
                        kho và OTA.
                      </p>
                      <div className="brand-toggles">
                        {[
                          'OnePlus',
                          'OPPO',
                          'Realme',
                          'Xiaomi',
                          'Redmi',
                          'POCO',
                        ].map((b) => (
                          <Toggle
                            key={b}
                            label={b}
                            checked={draft.brands.includes(b)}
                            onChange={(on) =>
                              setDraft({
                                ...draft,
                                brands: on
                                  ? [...draft.brands, b]
                                  : draft.brands.filter((v) => v !== b),
                              })
                            }
                          />
                        ))}
                      </div>
                      <DeviceSettings value={draft} onChange={setDraft} />
                    </div>
                    <div className="panel admin-panel">
                      <h2>Nhóm cộng đồng</h2>
                      <p className="panel-caption">
                        Để danh sách trống để ẩn phần cộng đồng.
                      </p>
                      <LinksEditor
                        value={draft.groups}
                        onChange={(groups) => setDraft({ ...draft, groups })}
                      />
                    </div>
                  </div>
                  <div className="panel admin-panel">
                    <h2>Thông tin ủng hộ</h2>
                    <Toggle
                      label="Hiển thị mục ủng hộ"
                      checked={draft.donate.enabled}
                      onChange={(enabled) =>
                        setDraft({
                          ...draft,
                          donate: { ...draft.donate, enabled },
                        })
                      }
                    />
                    <div className="admin-columns">
                      <div>
                        <Field label="Nội dung">
                          <Textarea
                            value={draft.donate.text}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                donate: {
                                  ...draft.donate,
                                  text: e.target.value,
                                },
                              })
                            }
                            rows={4}
                          />
                        </Field>
                        {(['bank', 'holder', 'account'] as const).map(
                          (key, i) => (
                            <Field
                              key={key}
                              label={
                                ['Ngân hàng', 'Chủ tài khoản', 'Số tài khoản'][
                                  i
                                ]
                              }
                            >
                              <Input
                                value={draft.donate[key]}
                                onChange={(e) =>
                                  setDraft({
                                    ...draft,
                                    donate: {
                                      ...draft.donate,
                                      [key]: e.target.value,
                                    },
                                  })
                                }
                              />
                            </Field>
                          ),
                        )}
                      </div>
                      <div>
                        <ImageField
                          label="Ảnh QR"
                          value={draft.donate.qr}
                          onChange={(qr) =>
                            setDraft({
                              ...draft,
                              donate: { ...draft.donate, qr },
                            })
                          }
                        />
                        <Field label="Liên kết ủng hộ (tùy chọn)">
                          <Input
                            type="url"
                            value={draft.donate.url}
                            placeholder="https://…"
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                donate: {
                                  ...draft.donate,
                                  url: e.target.value,
                                },
                              })
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                  <div className="save-bar">
                    <span>Thay đổi chỉ xuất hiện sau khi lưu.</span>
                    <div className="action-row">
                      <Button
                        type="button"
                        variant="outline"
                        className="action"
                        onClick={() => setPreview(true)}
                      >
                        <Eye size={16} />
                        Xem trước
                      </Button>
                      <Button type="submit" className="action" disabled={busy}>
                        <Save size={16} />
                        {busy ? 'Đang lưu…' : 'Lưu cấu hình'}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>
              <TabsContent value="catalog">
                <CatalogManager
                  changes={state.data.overrides}
                  act={act}
                  busy={busy}
                />
              </TabsContent>
              <TabsContent value="custom">
                <CustomManager
                  entries={state.data.customs}
                  act={act}
                  busy={busy}
                />
              </TabsContent>
              <TabsContent value="journal">
                <JournalManager
                  entries={state.data.logs}
                  act={act}
                  busy={busy}
                />
              </TabsContent>
              <TabsContent value="sync">
                <SyncPanel rows={state.data.cache} act={act} busy={busy} />
              </TabsContent>
            </Tabs>
            <Dialog open={preview} onOpenChange={setPreview}>
              <DialogContent className="preview-dialog">
                <DialogHeader>
                  <DialogTitle>Xem trước cấu hình</DialogTitle>
                  <DialogDescription>
                    Thông tin chưa lưu trong phiên chỉnh sửa này.
                  </DialogDescription>
                </DialogHeader>
                <div
                  className="settings-preview"
                  style={{ '--brand': draft.accent } as React.CSSProperties}
                >
                  <h1>
                    {draft.name}
                    <span>.</span>
                  </h1>
                  {draft.logo && (
                    <img className="preview-logo" src={draft.logo} alt="Logo" />
                  )}
                  <div className="preview-links">
                    {draft.sections
                      .filter((s) => s.enabled)
                      .map((s) => (
                        <span key={s.id}>
                          {navigation.find((n) => n.id === s.id)?.label}
                        </span>
                      ))}
                  </div>
                  <p>Hãng: {draft.brands.join(', ') || 'Chưa chọn'}</p>
                  {draft.groups.map((g, i) => (
                    <p key={i}>
                      {g.name} · {g.url}
                    </p>
                  ))}
                  {draft.donate.enabled && (
                    <>
                      <h2>Ủng hộ</h2>
                      <p className="preserve-text">{draft.donate.text}</p>
                      <p>
                        {draft.donate.bank} · {draft.donate.holder} ·{' '}
                        {draft.donate.account}
                      </p>
                      {draft.donate.qr && (
                        <img
                          className="donate-qr"
                          src={draft.donate.qr}
                          alt="QR xem trước"
                        />
                      )}
                    </>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )
      )}
    </Shell>
  );
}
type Act = (job: () => Promise<unknown>, message?: string) => Promise<boolean>;
function ImageField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Field
      label={label}
      hint="Ảnh PNG, JPG hoặc WebP, tối đa 2 MB. Có thể dùng URL HTTPS."
    >
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="URL ảnh hoặc tải ảnh bên dưới"
      />
      {value && <img className="image-field-preview" src={value} alt={label} />}
      <Input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        aria-label={'Tải ' + label}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setError('');
          try {
            const form = new FormData();
            form.set('file', file);
            const res = await fetch('/api/admin/upload', {
              method: 'POST',
              headers: { 'X-ROM-CSRF': '1' },
              body: form,
            });
            const data = (await res.json()) as { error: string; url: string };
            if (!res.ok) throw new Error(data.error);
            onChange(data.url);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy && <small>Đang tải ảnh…</small>}
      {error && (
        <span role="alert" className="field-error">
          {error}
        </span>
      )}
    </Field>
  );
}
function LinksEditor({
  value,
  onChange,
}: {
  value: { name: string; url: string }[];
  onChange: (v: { name: string; url: string }[]) => void;
}) {
  return (
    <div className="links-editor">
      {value.map((g, i) => (
        <div className="link-edit-row" key={i}>
          <Input
            aria-label={'Tên liên kết ' + (i + 1)}
            placeholder="Tên liên kết"
            value={g.name}
            onChange={(e) =>
              onChange(
                value.map((v, j) =>
                  i === j ? { ...v, name: e.target.value } : v,
                ),
              )
            }
          />
          <Input
            aria-label={'URL liên kết ' + (i + 1)}
            type="url"
            placeholder="https://…"
            value={g.url}
            onChange={(e) =>
              onChange(
                value.map((v, j) =>
                  i === j ? { ...v, url: e.target.value } : v,
                ),
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={'Bỏ liên kết ' + (i + 1)}
            onClick={() => onChange(value.filter((_, j) => i !== j))}
          >
            <XIcon />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="action"
        onClick={() => onChange([...value, { name: '', url: '' }])}
      >
        <Plus size={15} />
        Thêm liên kết
      </Button>
    </div>
  );
}
function XIcon() {
  return <Trash2 size={15} />;
}
function DeviceSettings({
  value,
  onChange,
}: {
  value: Settings;
  onChange: (v: Settings) => void;
}) {
  const root = useRemote<Cached<Catalog>>('/api/admin/catalog?source=archive');
  const names = [
    ...new Set([
      ...(root.data?.data.entries
        .filter((e) => e.kind === 'folder')
        .map((e) => e.name) || []),
      ...value.devices.map((d) => d.name),
    ]),
  ];
  const [extra, setExtra] = useState('');
  function change(name: string, enabled: boolean, order?: number) {
    const current = value.devices.find((d) => d.name === name);
    onChange({
      ...value,
      devices: [
        ...value.devices.filter((d) => d.name !== name),
        { name, enabled, order: order ?? current?.order ?? 999 },
      ],
    });
  }
  return (
    <details className="devices-settings">
      <summary>Tùy chỉnh từng thiết bị</summary>
      {root.error && <p>{root.error}</p>}
      <div className="device-settings-list">
        {names.map((name) => {
          const d = value.devices.find((v) => v.name === name);
          return (
            <div className="ordered-row" key={name}>
              <Toggle
                label={displayName(name)}
                checked={d?.enabled !== false}
                onChange={(v) => change(name, v)}
              />
              <Input
                className="order-input"
                type="number"
                aria-label={'Thứ tự ' + name}
                value={d?.order ?? 999}
                onChange={(e) =>
                  change(name, d?.enabled !== false, Number(e.target.value))
                }
              />
            </div>
          );
        })}
      </div>
      <div className="action-row">
        <Input
          placeholder="Tên thiết bị khác (đúng theo nguồn)"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          className="action"
          disabled={!extra.trim()}
          onClick={() => {
            change(extra.trim(), true);
            setExtra('');
          }}
        >
          Thêm
        </Button>
      </div>
    </details>
  );
}
function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
}) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Xác nhận
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function CatalogManager({
  changes,
  act,
  busy,
}: {
  changes: Override[];
  act: Act;
  busy: boolean;
}) {
  const [source, setSource] = useState('archive');
  const [path, setPath] = useState('');
  const [query, setQuery] = useState('');
  const result = useRemote<Cached<Catalog>>(
    `/api/admin/catalog?source=${source}&path=${encodeURIComponent(path)}`,
  );
  const [selected, setSelected] = useState<Entry | null>(null);
  const [edit, setEdit] = useState<Override>({ id: '' });
  const [reset, setReset] = useState(false);
  function choose(e: Entry) {
    setSelected(e);
    setEdit(
      changes.find((c) => c.id === e.id) || {
        id: e.id,
        name: e.name,
        hidden: false,
        order: 999,
        description: e.description || '',
        changelogVi: e.changelogVi || '',
        mirrors: e.mirrors || [],
      },
    );
  }
  return (
    <>
      <div className="panel admin-panel">
        <h2>Biên tập dữ liệu nguồn</h2>
        <p className="panel-caption">
          Nội dung bạn sửa được lưu riêng. Chọn “Về dữ liệu nguồn” để bỏ phần
          tùy chỉnh.
        </p>
        <div className="toolbar">
          <SelectField
            label="Nguồn"
            value={source}
            onChange={(v) => {
              setSource(v);
              setPath('');
              setQuery('');
              setSelected(null);
            }}
            options={[
              { value: 'archive', label: 'ROM Archive' },
              { value: 'sourceforge', label: 'SourceForge' },
              { value: 'ota', label: 'Bản phát hành OTA' },
            ]}
          />
          <Input
            placeholder="Lọc tên, thiết bị hoặc khu vực…"
            aria-label="Lọc danh mục quản trị"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="breadcrumbs">
          <Button
            variant="ghost"
            className="action"
            disabled={!path}
            onClick={() => setPath(path.split('/').slice(0, -1).join('/'))}
          >
            <ArrowLeft size={14} />
            Quay lại
          </Button>
          <span>
            {source === 'ota' ? 'Các bản phát hành OTA' : path || 'Thư mục gốc'}
          </span>
        </div>
        {result.loading ? (
          <Loading />
        ) : result.error ? (
          <ErrorState error={result.error} retry={result.reload} />
        ) : (
          <div className="catalog-editor-list">
            {result.data?.data.entries
              .filter((e) =>
                [e.name, e.device, e.region]
                  .join(' ')
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((e) => (
                <div className="edit-entry-row" key={e.id}>
                  <div className="grow">
                    <button
                      className="file-title"
                      onClick={() =>
                        e.kind === 'folder' ? setPath(e.path) : choose(e)
                      }
                    >
                      {e.kind === 'folder' && <Folder size={17} />}
                      <strong>{displayName(e.name)}</strong>
                      {e.kind === 'folder' && <ChevronRight size={15} />}
                    </button>
                    <p>
                      {source === 'ota' &&
                        `${e.device} · ${e.region || 'Không rõ khu vực'} · `}
                      {e.hidden ? 'Đang ẩn' : 'Đang hiển thị'}
                      {changes.some((v) => v.id === e.id)
                        ? ' · Đã tùy chỉnh'
                        : ''}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="action"
                    onClick={() => choose(e)}
                  >
                    <FilePenLine size={15} />
                    Biên tập
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="panel admin-panel edit-form">
          <h2>{selected.name}</h2>
          <p className="id-label">{selected.id}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void act(() => api('/api/admin/override', edit)).then(() =>
                result.reload(),
              );
            }}
          >
            <div className="admin-columns">
              <div>
                <Field label="Tên hiển thị">
                  <Input
                    value={edit.name ?? selected.name}
                    onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  />
                </Field>
                <Field label="Mô tả tiếng Việt">
                  <Textarea
                    value={edit.description || ''}
                    onChange={(e) =>
                      setEdit({ ...edit, description: e.target.value })
                    }
                    rows={4}
                  />
                </Field>
                <Field label="Changelog tiếng Việt">
                  <Textarea
                    value={edit.changelogVi || ''}
                    onChange={(e) =>
                      setEdit({ ...edit, changelogVi: e.target.value })
                    }
                    rows={7}
                  />
                </Field>
                <Toggle
                  label="Ẩn mục này"
                  checked={!!edit.hidden}
                  onChange={(hidden) => setEdit({ ...edit, hidden })}
                />
                <Field label="Thứ tự (số nhỏ hiển thị trước)">
                  <Input
                    type="number"
                    value={edit.order ?? 999}
                    onChange={(e) =>
                      setEdit({ ...edit, order: Number(e.target.value) })
                    }
                  />
                </Field>
                <h3>Mirror bổ sung đã xác minh</h3>
                <LinksEditor
                  value={edit.mirrors || []}
                  onChange={(mirrors) => setEdit({ ...edit, mirrors })}
                />
              </div>
              <div className="inline-preview">
                <span className="eyebrow">XEM TRƯỚC NỘI DUNG</span>
                <h3>{edit.name || selected.name}</h3>
                <p className="preserve-text">{edit.description}</p>
                <div className="changelog-text">
                  {edit.changelogVi || 'Chưa có changelog tiếng Việt.'}
                </div>
              </div>
            </div>
            <div className="action-row">
              <Button type="submit" className="action" disabled={busy}>
                <Save size={15} />
                Lưu nội dung
              </Button>
              <Button
                type="button"
                variant="outline"
                className="action"
                disabled={busy}
                onClick={() => setReset(true)}
              >
                <RotateCcw size={15} />
                Về dữ liệu nguồn
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="action"
                onClick={() => setSelected(null)}
              >
                Đóng
              </Button>
            </div>
          </form>
        </div>
      )}
      <Confirm
        open={reset}
        onClose={() => setReset(false)}
        title="Khôi phục dữ liệu nguồn?"
        description="Bỏ tên, mô tả, changelog, mirror và trạng thái tùy chỉnh của mục này."
        onConfirm={() => {
          void act(() =>
            api('/api/admin/reset-override', { id: selected?.id }),
          ).then((success) => {
            if (success) {
              setSelected(null);
              result.reload();
            }
          });
        }}
      />
    </>
  );
}
const blankCustom = {
  name: '',
  device: 'Oneplus 13',
  parent: '',
  category: 'archive',
  sourceUrl: '',
  downloadUrl: '',
  description: '',
  changelogVi: '',
  checksum: '',
  checksumType: 'MD5',
  mirrors: [] as { name: string; url: string }[],
  id: '',
};
function CustomManager({
  entries,
  act,
  busy,
}: {
  entries: Entry[];
  act: Act;
  busy: boolean;
}) {
  const [edit, setEdit] = useState(blankCustom);
  const [remove, setRemove] = useState('');
  return (
    <>
      <div className="panel admin-panel">
        <h2>Liên kết phần mềm riêng</h2>
        <p className="panel-caption">
          Thêm bản tải hoặc recovery từ nguồn bạn lựa chọn. Chỉ lưu liên kết,
          không lưu file ROM.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const saved = await api<Entry>('/api/admin/custom', edit);
              setEdit((current) => ({ ...current, id: saved.id }));
              return saved;
            });
          }}
        >
          <div className="admin-columns">
            <div>
              <Field label="Tên bản phần mềm">
                <Input
                  required
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                />
              </Field>
              <Field label="Thiết bị">
                <Input
                  value={edit.device}
                  onChange={(e) => setEdit({ ...edit, device: e.target.value })}
                />
              </Field>
              <SelectField
                label="Danh mục"
                value={edit.category}
                onChange={(category) => setEdit({ ...edit, category })}
                options={[
                  { value: 'archive', label: 'Kho phần mềm' },
                  { value: 'recovery', label: 'Recovery / OFOX' },
                ]}
              />
              <Field
                label="Thư mục chứa"
                hint="Đúng đường dẫn trong kho, ví dụ Oneplus 13/Custom Roms. Để trống để hiện ở trang đầu."
              >
                <Input
                  value={edit.parent}
                  onChange={(e) => setEdit({ ...edit, parent: e.target.value })}
                />
              </Field>
              <Field label="Trang phát hành">
                <Input
                  type="url"
                  placeholder="https://…"
                  required
                  value={edit.sourceUrl}
                  onChange={(e) =>
                    setEdit({ ...edit, sourceUrl: e.target.value })
                  }
                />
              </Field>
              <Field label="Link tải trực tiếp (tùy chọn)">
                <Input
                  type="url"
                  placeholder="https://…"
                  value={edit.downloadUrl}
                  onChange={(e) =>
                    setEdit({ ...edit, downloadUrl: e.target.value })
                  }
                />
              </Field>
            </div>
            <div>
              <Field label="Mô tả tiếng Việt">
                <Textarea
                  value={edit.description}
                  onChange={(e) =>
                    setEdit({ ...edit, description: e.target.value })
                  }
                  rows={3}
                />
              </Field>
              <Field label="Changelog tiếng Việt">
                <Textarea
                  value={edit.changelogVi}
                  onChange={(e) =>
                    setEdit({ ...edit, changelogVi: e.target.value })
                  }
                  rows={5}
                />
              </Field>
              <SelectField
                label="Loại checksum"
                value={edit.checksumType}
                onChange={(checksumType) => setEdit({ ...edit, checksumType })}
                options={['MD5', 'SHA-1', 'SHA-256'].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
              <Field label="Checksum">
                <Input
                  value={edit.checksum}
                  onChange={(e) =>
                    setEdit({ ...edit, checksum: e.target.value })
                  }
                />
              </Field>
              <LinksEditor
                value={edit.mirrors}
                onChange={(mirrors) => setEdit({ ...edit, mirrors })}
              />
            </div>
          </div>
          <div className="action-row">
            <Button type="submit" className="action" disabled={busy}>
              <Save size={15} />
              {edit.id ? 'Lưu bản chỉnh sửa' : 'Thêm phần mềm'}
            </Button>
            <Button
              variant="outline"
              type="button"
              className="action"
              onClick={() => setEdit(blankCustom)}
            >
              <Plus size={15} />
              Tạo mục mới
            </Button>
          </div>
        </form>
      </div>
      <div className="panel admin-panel">
        <h2>Các mục đã thêm</h2>
        {entries.length ? (
          entries.map((e) => (
            <div className="edit-entry-row" key={e.id}>
              <div className="grow">
                <h3>{e.name}</h3>
                <p>
                  {e.device} · {e.parent || 'Trang đầu'}
                </p>
              </div>
              <Button
                variant="outline"
                className="action"
                onClick={() =>
                  setEdit({
                    ...blankCustom,
                    ...e,
                    description: e.description || '',
                    changelogVi: e.changelogVi || '',
                    checksum: e.checksum || '',
                    checksumType: e.checksumType || 'MD5',
                    downloadUrl: e.downloadUrl || '',
                    device: e.device || '',
                    category: e.category || 'archive',
                    mirrors: e.mirrors || [],
                  })
                }
              >
                Sửa
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={'Xóa ' + e.name}
                onClick={() => setRemove(e.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))
        ) : (
          <p className="panel-caption">Chưa có liên kết riêng.</p>
        )}
      </div>
      <Confirm
        open={!!remove}
        onClose={() => setRemove('')}
        title="Xóa liên kết riêng?"
        description="Mục này sẽ được gỡ khỏi website. File tại nguồn không bị ảnh hưởng."
        onConfirm={() => {
          void act(() => api('/api/admin/delete-custom', { id: remove }));
        }}
      />
    </>
  );
}
function JournalManager({
  entries,
  act,
  busy,
}: {
  entries: SiteLog[];
  act: Act;
  busy: boolean;
}) {
  const blank = {
    id: '',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    body: '',
    published: false,
  };
  const [edit, setEdit] = useState(blank);
  const [remove, setRemove] = useState('');
  return (
    <>
      <div className="panel admin-panel">
        <h2>Changelog của website</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void act(async () => {
              const saved = await api<SiteLog>('/api/admin/log', edit);
              setEdit(saved);
              return saved;
            });
          }}
        >
          <div className="admin-columns">
            <div>
              <Field label="Tiêu đề">
                <Input
                  required
                  value={edit.title}
                  onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                />
              </Field>
              <Field label="Ngày cập nhật">
                <Input
                  type="date"
                  required
                  value={edit.date}
                  onChange={(e) => setEdit({ ...edit, date: e.target.value })}
                />
              </Field>
              <Field label="Nội dung">
                <Textarea
                  rows={8}
                  value={edit.body}
                  onChange={(e) => setEdit({ ...edit, body: e.target.value })}
                />
              </Field>
              <Toggle
                label="Xuất bản trên website"
                checked={edit.published}
                onChange={(published) => setEdit({ ...edit, published })}
              />
            </div>
            <div className="inline-preview">
              <span className="eyebrow">XEM TRƯỚC</span>
              <time>{edit.date}</time>
              <h2>{edit.title || 'Tiêu đề cập nhật'}</h2>
              <p className="preserve-text">{edit.body}</p>
            </div>
          </div>
          <div className="action-row">
            <Button type="submit" className="action" disabled={busy}>
              <Save size={15} />
              Lưu cập nhật
            </Button>
            <Button
              type="button"
              variant="outline"
              className="action"
              onClick={() => setEdit(blank)}
            >
              Viết mục mới
            </Button>
          </div>
        </form>
      </div>
      <div className="panel admin-panel">
        <h2>Các bài cập nhật</h2>
        {entries.map((e) => (
          <div className="edit-entry-row" key={e.id}>
            <div className="grow">
              <h3>{e.title}</h3>
              <p>
                {e.date} · {e.published ? 'Đã xuất bản' : 'Bản nháp'}
              </p>
            </div>
            <Button
              variant="outline"
              className="action"
              onClick={() => setEdit(e)}
            >
              Sửa
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={'Xóa ' + e.title}
              onClick={() => setRemove(e.id)}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        ))}
      </div>
      <Confirm
        open={!!remove}
        onClose={() => setRemove('')}
        title="Xóa bài cập nhật?"
        description="Bài này sẽ được gỡ khỏi nhật ký website."
        onConfirm={() => {
          void act(() => api('/api/admin/delete-log', { id: remove }));
        }}
      />
    </>
  );
}
function SyncPanel({
  rows,
  act,
  busy,
}: {
  rows: AdminData['cache'];
  act: Act;
  busy: boolean;
}) {
  const [source, setSource] = useState('archive');
  const [path, setPath] = useState('');
  return (
    <>
      <div className="panel admin-panel">
        <h2>Đồng bộ dữ liệu nguồn</h2>
        <p className="panel-caption">
          Danh mục tự làm mới khi được mở sau 15 phút. Thao tác này chỉ cập nhật
          dữ liệu nguồn, giữ nguyên nội dung bạn biên tập.
        </p>
        <div className="toolbar">
          <SelectField
            label="Nguồn cần làm mới"
            value={source}
            onChange={setSource}
            options={[
              { value: 'archive', label: 'ROM Archive' },
              { value: 'sourceforge', label: 'SourceForge' },
              { value: 'ota', label: 'Danh mục OTA' },
              { value: 'stats', label: 'Thống kê máy chủ' },
            ]}
          />
          {['archive', 'sourceforge'].includes(source) && (
            <Field label="Đường dẫn thư mục">
              <Input
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="Để trống cho thư mục gốc"
              />
            </Field>
          )}
          <Button
            className="action"
            disabled={busy}
            onClick={() =>
              void act(
                () => api('/api/admin/sync', { source, path }),
                'Đã làm mới dữ liệu. Kiểm tra trạng thái từng nguồn bên dưới.',
              )
            }
          >
            <RefreshCw size={15} />
            {busy ? 'Đang đồng bộ…' : 'Làm mới ngay'}
          </Button>
        </div>
      </div>
      <div className="panel admin-panel">
        <h2>Lịch sử kết nối</h2>
        {rows.length ? (
          rows.map((row) => (
            <div className="sync-row" key={row.key}>
              <div className="grow">
                <h3>{row.key}</h3>
                <p>
                  Thành công:{' '}
                  {row.updated_at
                    ? timeLabel(row.updated_at)
                    : 'Chưa có lần thành công'}
                </p>
                <p>Lần thử gần nhất: {timeLabel(row.attempted_at)}</p>
                {row.error && <p className="field-error">{row.error}</p>}
              </div>
              <span className={`state-badge ${row.error ? 'is-stale' : ''}`}>
                {row.error
                  ? row.updated_at
                    ? 'Đang dùng bản đã lưu'
                    : 'Chưa kết nối được'
                  : 'Đã đồng bộ'}
              </span>
            </div>
          ))
        ) : (
          <p className="panel-caption">
            Mở danh mục hoặc chọn nguồn để bắt đầu đồng bộ.
          </p>
        )}
      </div>
    </>
  );
}
