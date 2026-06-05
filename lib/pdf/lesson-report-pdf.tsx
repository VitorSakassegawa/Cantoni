import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { LOGO_PNG_DATA_URI } from '@/lib/pdf/logo-data'

export type LessonReportPdfData = {
  studentName: string
  lessonDate: string
  summaryPt?: string | null
  vocabulary: Array<{ word: string; translation: string; example?: string }>
}

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 48, paddingHorizontal: 56, fontSize: 11, color: '#0f172a', lineHeight: 1.5 },
  header: { alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', paddingBottom: 20, marginBottom: 24 },
  logo: { width: 96, height: 'auto', marginBottom: 10 },
  brand: { fontSize: 8, letterSpacing: 2, color: '#94a3b8', textTransform: 'uppercase' },
  docTitle: { fontSize: 20, fontWeight: 700, marginTop: 6 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metaCard: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, padding: 12 },
  metaLabel: { fontSize: 8, letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  metaValue: { fontSize: 12, fontWeight: 700 },
  sectionTitle: { fontSize: 9, letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginTop: 8 },
  paragraph: { marginBottom: 4 },
  bullet: { flexDirection: 'row', marginBottom: 3 },
  bulletDot: { width: 10 },
  heading: { fontSize: 12, fontWeight: 700, color: '#0f172a', marginTop: 8, marginBottom: 3 },
  vocabGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vocabCard: { width: '47%', backgroundColor: '#f8fafc', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  vocabWord: { fontSize: 11, fontWeight: 700 },
  vocabTranslation: { fontSize: 10, color: '#475569' },
  vocabExample: { fontSize: 9, color: '#64748b', fontStyle: 'italic', marginTop: 2 },
  footer: { marginTop: 28, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 14, textAlign: 'center' },
  footerText: { fontSize: 8, letterSpacing: 1, color: '#94a3b8', textTransform: 'uppercase' },
  empty: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 16, textAlign: 'center', color: '#64748b' },
})

// Renders the lesson summary markdown into PDF primitives. Supports headings
// (#), bold (**…**) and bullet (- / *) lists — the same subset the email and
// the on-screen report use.
function renderSummary(markdown: string) {
  const nodes: React.ReactElement[] = []
  let key = 0

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue

    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      nodes.push(<Text key={key++} style={styles.heading}>{stripBold(heading[1])}</Text>)
      continue
    }
    const bullet = line.match(/^[-*]\s+(.*)$/)
    if (bullet) {
      nodes.push(
        <View key={key++} style={styles.bullet}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={{ flex: 1 }}>{stripBold(bullet[1])}</Text>
        </View>
      )
      continue
    }
    nodes.push(<Text key={key++} style={styles.paragraph}>{stripBold(line)}</Text>)
  }

  return nodes
}

// @react-pdf has no rich inline styling here; we strip the ** markers so they
// don't leak as literal characters (kept simple and robust).
function stripBold(value: string) {
  return value.replace(/\*\*(.+?)\*\*/g, '$1')
}

export function LessonReportPdf({ data }: { data: LessonReportPdfData }) {
  return (
    <Document title={`Relatório de Aula — ${data.studentName}`} author="Cantoni English School">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* @react-pdf Image is not an HTML img and has no alt prop */}
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.logo} src={LOGO_PNG_DATA_URI} />
          <Text style={styles.brand}>Cantoni English School</Text>
          <Text style={styles.docTitle}>Relatório de Aula</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Aluno(a)</Text>
            <Text style={styles.metaValue}>{data.studentName}</Text>
          </View>
          <View style={styles.metaCard}>
            <Text style={styles.metaLabel}>Data da aula</Text>
            <Text style={styles.metaValue}>{data.lessonDate}</Text>
          </View>
        </View>

        {data.summaryPt ? (
          <View>
            <Text style={styles.sectionTitle}>Resumo da aula</Text>
            {renderSummary(data.summaryPt)}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text>O resumo desta aula ainda não foi gerado.</Text>
          </View>
        )}

        {data.vocabulary.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Vocabulário da aula</Text>
            <View style={styles.vocabGrid}>
              {data.vocabulary.map((entry, index) => (
                <View key={`${entry.word}-${index}`} style={styles.vocabCard}>
                  <Text style={styles.vocabWord}>{entry.word}</Text>
                  <Text style={styles.vocabTranslation}>{entry.translation}</Text>
                  {entry.example ? <Text style={styles.vocabExample}>“{entry.example}”</Text> : null}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Cantoni English School · Relatório gerado automaticamente</Text>
        </View>
      </Page>
    </Document>
  )
}
