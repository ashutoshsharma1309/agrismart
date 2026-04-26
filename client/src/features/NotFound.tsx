import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Leaf } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="text-center">
        <div className="mx-auto mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Leaf size={28} />
        </div>
        <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t('notfound.title')}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">{t('notfound.body')}</p>
        <div className="mt-6 flex justify-center">
          <Link to="/">
            <Button leadingIcon={<ArrowLeft size={16} />}>{t('notfound.cta')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
