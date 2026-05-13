import { getRouteUiConfig } from '../config/routes.config';

type TitleTranslator = (key: string, options?: { defaultValue?: string }) => string;

const APP_TITLE_SEPARATOR = ' - ';

export function getAuthedDocumentTitle(
  pathWithoutLang: string,
  t: TitleTranslator
): string {
  const appName = t('common.appName', { defaultValue: 'DuHan' });

  if (pathWithoutLang.startsWith('/community/qa/ask')) {
    return `${t('qa.askQuestion', { defaultValue: 'Ask a Question' })}${APP_TITLE_SEPARATOR}${appName}`;
  }

  const routeUiConfig = getRouteUiConfig(pathWithoutLang);
  const pageTitle = t(routeUiConfig.headerTitle, {
    defaultValue: routeUiConfig.headerTitleDefault ?? appName,
  });

  if (!pageTitle || pageTitle === appName) {
    return appName;
  }

  return `${pageTitle}${APP_TITLE_SEPARATOR}${appName}`;
}
