import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { WEAK_POINTS } from '../../utils/convexRefs';
import { KT } from '../mobile/ksoft/ksoft';

export function DesktopWeakPointsCard({
  language,
}: Readonly<{
  language: string;
}>) {
  const { t } = useTranslation();
  const weakGrammar = useQuery(WEAK_POINTS.getWeakGrammarPatterns, { language, limit: 3 });
  const weakVocab = useQuery(WEAK_POINTS.getWeakVocabCategories, { language, limit: 3 });

  return (
    <section
      style={{
        border: `1px solid ${KT.line}`,
        background: KT.card,
        borderRadius: 18,
        padding: 16,
        boxShadow: KT.shSm,
      }}
    >
      <p
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: KT.sub,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
        }}
      >
        {t('weakPoints.title', { defaultValue: 'Focus areas' })}
      </p>

      <div style={{ marginTop: 10, display: 'grid', gap: 10 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: KT.ink }}>Grammar</p>
          {weakGrammar === undefined ? (
            <p style={{ fontSize: 12, color: KT.sub, marginTop: 3 }}>
              {t('common.loading', { defaultValue: 'Loading…' })}
            </p>
          ) : weakGrammar.length === 0 ? (
            <p style={{ fontSize: 12, color: KT.sub, marginTop: 3 }}>No weak patterns.</p>
          ) : (
            <ul style={{ marginTop: 4, display: 'grid', gap: 4, paddingLeft: 16 }}>
              {weakGrammar.map(item => (
                <li key={item.grammarId} style={{ fontSize: 12, color: KT.ink2 }}>
                  {item.title} ({item.proficiency}%)
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: KT.ink }}>Vocabulary</p>
          {weakVocab === undefined ? (
            <p style={{ fontSize: 12, color: KT.sub, marginTop: 3 }}>
              {t('common.loading', { defaultValue: 'Loading…' })}
            </p>
          ) : weakVocab.length === 0 ? (
            <p style={{ fontSize: 12, color: KT.sub, marginTop: 3 }}>No weak categories.</p>
          ) : (
            <ul style={{ marginTop: 4, display: 'grid', gap: 4, paddingLeft: 16 }}>
              {weakVocab.map(item => (
                <li key={item.partOfSpeech} style={{ fontSize: 12, color: KT.ink2 }}>
                  {item.partOfSpeech} ({item.totalLapses})
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
