import { describe, expect, it } from 'vitest'
import {
  addSimilarity,
  cosineSimilarity,
  describeIssue,
  hasErrors,
  itemsToInsert,
  matchKey,
  normalizeText,
  prepareImport,
  similarWithinBatch,
  summarizePlan,
  toImportRow,
  withAssignedIds,
  wordCount,
  type ExistingQuestion,
} from '.'

const TODAY = '2026-10-06'

function question(overrides: Record<string, unknown> = {}) {
  return {
    topic: 'geography',
    format: 'open',
    difficulty: 1,
    question: 'Koji je glavni grad Australije?',
    answer: 'Canberra',
    note: 'Grad je izgrađen kao kompromis između Sydneyja i Melbournea.',
    source: 'Wikipedia (hr): Canberra',
    ...overrides,
  }
}

function existing(overrides: Partial<ExistingQuestion> = {}): ExistingQuestion {
  return {
    id: 'geography-0001',
    topic: 'geography',
    format: 'open',
    status: 'approved',
    question: 'Koji je glavni grad Kanade?',
    answer: 'Ottawa',
    ...overrides,
  }
}

const codes = (data: unknown[], db: ExistingQuestion[] = []) =>
  prepareImport(data, db, TODAY).items.map((p) => p.issues.map((i) => i.code))

describe('normalizeText', () => {
  it('collapses whitespace', () => {
    expect(normalizeText('  Koji   je\n grad? ')).toBe('Koji je grad?')
  })

  it('uses Croatian quotes', () => {
    expect(normalizeText('Tko je napisao "Zlatarovo zlato"?')).toBe(
      'Tko je napisao „Zlatarovo zlato”?',
    )
    expect(normalizeText('Pjesma “Moja domovina”')).toBe('Pjesma „Moja domovina”')
  })

  it('leaves apostrophes alone', () => {
    expect(normalizeText("D'Artagnan")).toBe("D'Artagnan")
  })
})

describe('matchKey', () => {
  it('ignores case, diacritics and punctuation', () => {
    expect(matchKey('Đakovo, Čakovec!')).toBe(matchKey('dakovo cakovec'))
    expect(matchKey('„Šuma Striborova”')).toBe('suma striborova')
  })
})

describe('wordCount', () => {
  it('does not count the true/false lead-in', () => {
    expect(wordCount('Točno ili netočno: Sunce je zvijezda.')).toBe(3)
  })
})

describe('prepareImport', () => {
  it('rejects a file that is not a list', () => {
    expect(prepareImport({ question: 'x' }, [], TODAY).fileError).toBe('notList')
  })

  it('accepts a good question and fills in the defaults', () => {
    const plan = prepareImport([question()], [], TODAY)
    expect(hasErrors(plan)).toBe(false)
    expect(plan.items[0]!.issues).toEqual([])
    expect(plan.items[0]!.item).toMatchObject({
      origin: 'own',
      status: 'approved',
      checkedAt: TODAY,
      accept: [],
      tags: [],
      timeSensitive: false,
    })
  })

  it('puts questions from other sources on review', () => {
    const plan = prepareImport([question({ origin: 'hks/set#1' })], [], TODAY)
    expect(plan.items[0]!.item!.status).toBe('review')
  })

  it('reports format errors per field, in Croatian', () => {
    const plan = prepareImport([question({ difficulty: 5, timesensitive: true })], [], TODAY)
    const issues = plan.items[0]!.issues
    expect(issues.map((i) => i.code)).toEqual(['invalid', 'invalid'])
    expect(describeIssue(issues[0]!)).toMatch(/^difficulty: Neispravna opcija/)
    expect(describeIssue(issues[1]!)).toMatch(/timesensitive/)
    expect(hasErrors(plan)).toBe(true)
  })

  it('requires a note and a source', () => {
    expect(codes([question({ note: ' ', source: undefined })])).toEqual([['noNote', 'noSource']])
  })

  it('checks true/false and estimate answers', () => {
    expect(
      codes([
        question({ format: 'true_false', question: 'Canberra je glavni grad.', answer: 'Da' }),
        question({ format: 'estimate', question: 'Koliko je visok?', answer: 'vrlo' }),
      ]),
    ).toEqual([['trueFalsePrefix', 'trueFalseAnswer'], ['estimateNumber']])
  })

  it('warns about long questions and time words', () => {
    const long = Array.from({ length: 26 }, () => 'riječ').join(' ')
    expect(codes([question({ question: long })])).toEqual([['tooLong']])
    expect(codes([question({ question: 'Tko je trenutno predsjednik?' })])).toEqual([['timeWord']])
    expect(
      codes([question({ question: 'Tko je trenutno predsjednik?', timeSensitive: true })]),
    ).toEqual([[]])
    expect(
      codes([question({ question: 'Tko je dao sagraditi crkvu u današnjem obliku?' })]),
    ).toEqual([[]])
    expect(codes([question({ question: 'Koji je bio zadnji car?' })])).toEqual([['timeWord']])
  })

  it('finds the same question with the same answer, in the database and in the file', () => {
    const db = [existing({ question: 'Koji je glavni grad Australije', answer: 'canberra' })]
    expect(codes([question()], db)).toEqual([['duplicate', 'answerRepeated']])
    expect(codes([question(), question()])).toEqual([[], ['duplicateInBatch', 'answerRepeated']])
  })

  it('allows the same answer at most twice in a topic', () => {
    const db = [
      existing({
        id: 'geography-0001',
        question: 'Gdje je parlament Australije?',
        answer: 'Canberra',
      }),
      existing({
        id: 'geography-0002',
        question: 'Koji grad je projektirao Griffin?',
        answer: 'Canberra',
      }),
    ]
    const plan = prepareImport([question()], db, TODAY)
    expect(plan.items[0]!.issues).toEqual([
      { level: 'error', code: 'answerLimit', ids: ['geography-0001', 'geography-0002'] },
    ])
  })

  it('does not count rejected questions or other topics towards the answer limit', () => {
    const db = [
      existing({ id: 'geography-0001', question: 'A?', answer: 'Canberra', status: 'rejected' }),
      existing({ id: 'history-0001', topic: 'history', question: 'B?', answer: 'Canberra' }),
    ]
    expect(codes([question()], db)).toEqual([['answerElsewhere']])
  })

  it('warns about the same answer in another topic, by answer or accepted form', () => {
    const db = [
      existing({
        id: 'general-0004',
        topic: 'general',
        question: 'Koji modni dodatak…?',
        answer: 'Kravata',
      }),
      existing({
        id: 'general-0009',
        topic: 'general',
        question: 'A?',
        answer: 'Kravata',
        status: 'archived',
      }),
    ]
    const plan = prepareImport(
      [
        question({
          topic: 'language_literature',
          question: 'Koja riječ…?',
          answer: 'Cravat',
          accept: ['kravata'],
        }),
      ],
      db,
      TODAY,
    )
    expect(plan.items[0]!.issues).toEqual([
      { level: 'warning', code: 'answerElsewhere', ids: ['general-0004'] },
    ])
  })

  it('warns when another question gives the answer away, allowing case endings', () => {
    const db = [
      existing({
        id: 'language_literature-0047',
        topic: 'language_literature',
        question: 'Kako se zove kit kojeg progoni kapetan Ahab?',
        answer: 'Moby Dick',
      }),
      existing({
        id: 'language_literature-0002',
        topic: 'language_literature',
        question: 'Tko pada kroz zečju rupu u romanu Lewisa Carrolla?',
        answer: 'Alisa',
      }),
    ]
    const ahab = question({
      topic: 'language_literature',
      question: 'Tko zapovijeda Pequodom?',
      answer: 'Ahab',
      accept: ['kapetan Ahab'],
    })
    const carroll = question({
      topic: 'language_literature',
      question: 'Tko je Charles Dodgson?',
      answer: 'Lewis Carroll',
    })
    expect(codes([ahab, carroll], db)).toEqual([['answerMentioned'], ['answerMentioned']])
  })

  it('warns when the new question or its note gives away an existing answer', () => {
    const db = [
      existing({
        id: 'film_tv-0001',
        topic: 'film_tv',
        question: 'Tko je skladao glazbu?',
        answer: 'Howard Shore',
      }),
    ]
    const plan = prepareImport(
      [
        question({
          topic: 'film_tv',
          question: 'Koji je film iz 2001.?',
          answer: 'Prstenova družina',
          note: 'Glazbu je skladao Howard Shore.',
        }),
      ],
      db,
      TODAY,
    )
    expect(plan.items[0]!.issues).toEqual([
      { level: 'warning', code: 'mentionsAnswer', ids: ['film_tv-0001'] },
    ])
  })

  it('leaves the overlap check out when asked (the editor checks one question at a time)', () => {
    const db = [
      existing({ id: 'history-0001', topic: 'history', question: 'B?', answer: 'Canberra' }),
    ]
    const plan = prepareImport([question()], db, TODAY, { overlaps: false })
    expect(plan.items[0]!.issues).toEqual([])
  })

  it('ignores common answers, numbers and true/false questions in the overlap check', () => {
    const zagreb = (n: number) =>
      existing({
        id: `culture-000${n}`,
        topic: 'culture',
        question: `Što je u Zagrebu ${n}?`,
        answer: `X${n}`,
      })
    const db = [1, 2, 3, 4].map(zagreb)
    expect(
      codes([question({ topic: 'music', question: 'Koji grad?', answer: 'Zagreb' })], db),
    ).toEqual([[]])
    const tf = question({
      format: 'true_false',
      question: 'Točno ili netočno: X1 je u Zagrebu.',
      answer: 'Točno',
    })
    expect(codes([tf], [existing({ answer: 'Točno', format: 'true_false' })])).toEqual([[]])
    const estimate = question({ format: 'estimate', question: 'Koliko?', answer: '1440' })
    expect(
      codes([estimate], [existing({ topic: 'history', question: 'Godina 1440?', answer: '1440' })]),
    ).toEqual([[]])
  })

  it('does not apply the answer limit to true/false questions', () => {
    const tf = (text: string) =>
      question({ format: 'true_false', question: `Točno ili netočno: ${text}`, answer: 'Točno' })
    expect(codes([tf('A.'), tf('B.'), tf('C.')])).toEqual([[], [], []])
  })

  it('skips questions that were already imported and refuses unknown ids', () => {
    const plan = prepareImport(
      [question({ id: 'geography-0001' }), question({ id: 'geography-0099' })],
      [existing()],
      TODAY,
    )
    expect(plan.items.map((p) => p.action)).toEqual(['skip', 'insert'])
    expect(plan.items[1]!.issues.map((i) => i.code)).toEqual(['unknownId'])
  })
})

describe('similarity', () => {
  it('computes cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('finds similar questions within a file, once per pair', () => {
    const found = similarWithinBatch(
      new Map([
        [0, [1, 0]],
        [1, [0, 1]],
        [2, [1, 0.01]],
      ]),
    )
    expect([...found.keys()]).toEqual([2])
    expect(found.get(2)![0]!.id).toBe('#1')
  })

  it('makes likely duplicates errors and possible ones warnings', () => {
    const plan = prepareImport(
      [question(), question({ question: 'Drugo?', answer: 'Perth' })],
      [],
      TODAY,
    )
    const matches = new Map([
      [0, [{ id: 'geography-0005', similarity: 0.97 }]],
      [
        1,
        [
          { id: 'geography-0006', similarity: 0.94 },
          { id: 'x', similarity: 0.5 },
        ],
      ],
    ])
    const checked = addSimilarity(plan, matches)
    expect(checked.items.map((p) => p.issues.map((i) => i.level))).toEqual([['error'], ['warning']])
    expect(describeIssue(checked.items[0]!.issues[0]!)).toBe(
      'Slično pitanju geography-0005 (97 %).',
    )
    const allowed = addSimilarity(plan, matches, { allowLikely: true })
    expect(hasErrors(allowed)).toBe(false)
  })
})

describe('rows and ids', () => {
  it('builds rows for the database function', () => {
    const plan = prepareImport([question({ editorNote: 'x' })], [], TODAY)
    const row = toImportRow(itemsToInsert(plan)[0]!.item, [0.5, -0.25])
    expect(row).toMatchObject({
      topic: 'geography',
      time_sensitive: false,
      checked_at: TODAY,
      editor_note: 'x',
      embedding: '[0.5,-0.25]',
    })
    expect(row).not.toHaveProperty('id')
  })

  it('writes the given ids into the original file, first', () => {
    const data = [{ question: 'a' }, { question: 'b' }]
    const result = withAssignedIds(data, new Map([[1, 'sport-0007']]))
    expect(result).toEqual([{ question: 'a' }, { id: 'sport-0007', question: 'b' }])
    expect(Object.keys(result[1]!)[0]).toBe('id')
  })

  it('summarizes a plan', () => {
    const plan = prepareImport(
      [
        question({ id: 'geography-0001' }),
        question({ format: 'true_false', question: 'Točno ili netočno: A.', answer: 'Točno' }),
        question({ note: '' }),
      ],
      [existing()],
      TODAY,
    )
    expect(summarizePlan(plan)).toEqual({
      insert: 2,
      skip: 1,
      errors: 1,
      warnings: 0,
      trueFalse: { yes: 1, no: 0 },
    })
  })
})
