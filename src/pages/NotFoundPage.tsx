import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '../components/LocalizedLink';
import { SEO as Seo } from '../seo/SEO';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-6">
      <Seo
        title={t('seo.notFound.title', '404 - Page Not Found | DuHan')}
        description={t('seo.notFound.description', 'The page you are looking for does not exist.')}
        noIndex
      />
      <div className="w-full max-w-lg rounded-2xl border-2 border-foreground bg-card p-8 shadow-pop">
        <div className="text-5xl font-display tracking-wide">404</div>
        <div className="mt-3 text-lg font-bold">{t('common.notFound', 'Page not found')}</div>
        <div className="mt-2 text-muted-foreground">
          {t('common.notFoundHint', "We couldn't find the page you requested.")}
        </div>
        <div className="mt-6 flex gap-3">
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="inline-flex items-center justify-center rounded-xl border-2 border-foreground bg-indigo-500 dark:bg-indigo-400 px-4 py-2 font-bold text-white dark:text-primary-foreground shadow-pop hover:translate-y-1 hover:shadow-none transition-all"
          >
            <LocalizedLink to="/">{t('common.backHome', 'Back to home')}</LocalizedLink>
          </Button>
        </div>
      </div>
    </div>
  );
}
