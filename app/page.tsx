import { Library } from '@/components/rom/library';
import { LanguageProvider } from '@/lib/language';
export default function Home() {
  return (
    <LanguageProvider>
      <Library />
    </LanguageProvider>
  );
}
