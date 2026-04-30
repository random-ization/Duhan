import re

with open('src/components/mobile/MobileDashboard.tsx', 'r') as f:
    content = f.read()

# 1. Remove the static `path` array and related state
# It starts at `const path: PathStep[] = [` and ends right before `const dateLabel = `
pattern1 = r"const path: PathStep\[\] = \[\s*\{.*?const streakDoneDays = Math\.min\(7, Math\.max\(0, streak % 7 \|\| \(streak > 0 \? 7 : 0\)\)\);\n"
match1 = re.search(pattern1, content, flags=re.DOTALL)
if match1:
    content = content[:match1.start()] + "const streakDoneDays = Math.min(7, Math.max(0, streak % 7 || (streak > 0 ? 7 : 0)));\n" + content[match1.end():]
else:
    print("Could not find pattern 1")

content = re.sub(r"const \[activePathSlide, setActivePathSlide\] = React\.useState\(0\);\n", "", content)
content = re.sub(r"const pathScrollRef = React\.useRef<HTMLDivElement>\(null\);\n", "", content)


# 2. Find and replace the TODAY'S PATH hero AND the Vocab Today's Path
# They start at `{/* TODAY'S PATH hero */}` and end just before `{achievements.length > 0 && (`
pattern2 = r"\{/\* TODAY'S PATH hero \*/\}.*?(?=\{achievements\.length > 0 && \()"
match2 = re.search(pattern2, content, flags=re.DOTALL)

replacement2 = """{/* TODAY'S PATH hero (Vocab focus) */}
      <div style={{ padding: '0 18px', marginTop: 8 }}>
        <div
          style={{
            background: KT.card,
            borderRadius: 28,
            boxShadow: KT.sh,
            overflow: 'hidden',
            border: `1px solid ${KT.line}`,
            position: 'relative',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HanjaSeal c="道" size={28} bg={KT.crimson} round={6} />
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: KT.ink,
                    letterSpacing: -0.2,
                  }}
                >
                  {copy.pathTitle}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: KT.sub,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    marginTop: 1,
                  }}
                >
                  {vocabTodayPath.estimatedMinutes > 0 
                    ? `${language.startsWith('zh') ? '预计' : 'Est.'} ${vocabTodayPath.estimatedMinutes} ${language.startsWith('zh') ? '分钟' : 'min'}`
                    : language.startsWith('zh') ? '全部完成' : 'All done'}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ height: 1, background: KT.line }} />

          {/* Steps */}
          <div style={{ padding: '16px 20px' }}>
            {vocabTodayPath.steps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: KT.subLight, fontSize: 13, fontWeight: 500 }}>
                {language.startsWith('zh') ? '太棒了！今天的单词任务已全部完成。' : 'Awesome! All vocab tasks for today are done.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {vocabTodayPath.steps.map((vstep, idx) => {
                  const meta = renderVocabPathRow(vstep, language);
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        background: `${meta.tone}15`, 
                        color: meta.tone, 
                        display: 'grid', 
                        placeItems: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: KT.serif,
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: KT.ink, letterSpacing: -0.2 }}>
                          {meta.title}
                        </div>
                        {meta.sub && (
                          <div style={{ fontSize: 12, color: KT.sub, marginTop: 2, fontWeight: 500 }}>
                            {meta.sub}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action */}
          {vocabTodayPath.steps.length > 0 && (
            <div style={{ padding: '0 20px 20px' }}>
              <button
                type="button"
                onClick={() => {
                  const target = vocabTodayPath.steps[0].target;
                  const connector = target.includes('?') ? '&' : '?';
                  navigate(appendReturnToPath(`${target}${connector}flow=today`, dashboardPath));
                }}
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 18,
                  background: KT.ink,
                  color: KT.bg,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  cursor: 'pointer',
                  fontFamily: KT.font,
                  boxShadow: '0 4px 14px rgba(31,27,23,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>{language.startsWith('zh') ? '开始今日学习' : 'Start Today\\'s Path'}</span>
                <span style={{ fontSize: 16 }}>▶</span>
              </button>
            </div>
          )}
        </div>
      </div>

      """

if match2:
    content = content[:match2.start()] + replacement2 + content[match2.end():]
else:
    print("Could not find pattern 2")

with open('src/components/mobile/MobileDashboard.tsx', 'w') as f:
    f.write(content)
print("Done rewriting")
