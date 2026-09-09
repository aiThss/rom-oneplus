import { Admin } from '@/components/rom/admin';
import { LanguageProvider } from '@/lib/language';

export const dynamic = 'force-dynamic';

export default function AithsPage() {
  return (
    <LanguageProvider>
      <Admin />
    </LanguageProvider>
  );
}
