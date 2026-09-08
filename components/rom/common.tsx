'use client';
// React Compiler is not enabled; effects synchronize remote data and browser preferences.
/* eslint-disable react/react-compiler */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Copy,
  Check,
  Inbox,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
export async function api<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(
    url,
    body === undefined
      ? {}
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-ROM-CSRF': '1' },
          body: JSON.stringify(body),
        },
  );
  const value = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(value.error || 'Không thực hiện được yêu cầu.');
  return value;
}
export function useRemote<T>(url: string | null) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!!url);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!url) {
      setData(undefined);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setData(undefined);
    setError('');
    setLoading(true);
    fetch(url, { signal: ctrl.signal })
      .then(async (res) => {
        const d = (await res.json()) as T & { error?: string };
        if (!res.ok) throw new Error(d.error || 'Không đọc được dữ liệu.');
        setData(d);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [url, version]);
  return {
    data,
    error,
    loading,
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}
export function CopyButton({
  value,
  label = 'Sao chép',
}: {
  value: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  return (
    <span className="copy-wrap">
      <Button
        variant="outline"
        className="action"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setError(false);
            setTimeout(() => setDone(false), 1800);
          } catch {
            setError(true);
          }
        }}
      >
        {done ? <Check size={15} /> : <Copy size={15} />}{' '}
        {done ? 'Đã sao chép' : label}
      </Button>
      {error && (
        <output className="field-error">
          Không thể sao chép tự động. Bạn có thể chọn và chép văn bản.
        </output>
      )}
    </span>
  );
}
export function External({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <a
      className={`action ${primary ? 'primary' : 'secondary-action'}`}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children}
      <ExternalLink size={14} />
    </a>
  );
}
export function EmptyState({
  title = 'Chưa có dữ liệu',
  description = 'Thử chọn danh mục khác hoặc quay lại sau.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Empty className="panel empty-state">
      <EmptyHeader>
        <Inbox size={30} />
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function Loading() {
  return (
    <div
      className="loading-grid"
      aria-label="Đang tải dữ liệu"
      aria-busy="true"
    >
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-28 rounded-3xl" />
      ))}
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div role="alert" className="notice error">
      <AlertCircle size={19} />
      <div className="grow">
        <strong>Chưa kết nối được dữ liệu</strong>
        <p>{error}</p>
      </div>
      {retry && (
        <Button variant="outline" className="action" onClick={retry}>
          <RefreshCw size={15} />
          Thử lại
        </Button>
      )}
    </div>
  );
}
export function SelectField({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <label className="filter-label">
      <span>{label}</span>
      <Select value={value} onValueChange={(v) => onChange(v || '')}>
        <SelectTrigger className="filter-select" aria-label={label}>
          <SelectValue>
            {options.find((o) => o.value === value)?.label || label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem value={o.value} key={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
export function SearchPicker({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
}) {
  return (
    <label className="filter-label">
      <span>{label}</span>
      <Combobox
        items={options}
        value={value || null}
        onValueChange={(v) => onChange(v || '')}
      >
        <ComboboxInput
          placeholder={label}
          aria-label={label}
          showClear
          className="w-full min-w-0"
        />
        <ComboboxContent>
          <ComboboxEmpty>Không tìm thấy thiết bị.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem
                key={item}
                value={item}
                className="truncate min-w-0"
              >
                <span className="truncate">{item}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </label>
  );
}
export function timeLabel(time: number) {
  return new Date(time).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
export { Markdown } from './markdown';
