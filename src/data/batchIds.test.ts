import { describe, expect, it } from 'vitest'
import { assignIds, type BatchFile } from './batchIds'
import type { BatchQuestion } from './batchSchema'

function item(topic: BatchQuestion['topic'], id?: string): BatchQuestion {
  return {
    ...(id ? { id } : {}),
    topic,
    format: 'open',
    difficulty: 1,
    question: 'Q?',
    answer: 'A',
    accept: [],
    tags: [],
    timeSensitive: false,
    origin: 'own',
  }
}

const ids = (files: BatchFile[]) => assignIds(files).map((q) => q.id)

describe('assignIds', () => {
  it('keeps the ids the import wrote into the files', () => {
    expect(ids([{ name: 'a.json', items: [item('sport', 'sport-0007')] }])).toEqual(['sport-0007'])
  })

  it('numbers questions that are not imported yet after the highest id in their topic', () => {
    const files = [
      {
        name: 'sport-pilot.json',
        items: [item('sport', 'sport-0001'), item('sport', 'sport-0002')],
      },
      { name: 'mixed.json', items: [item('sport'), item('music')] },
    ]
    expect(ids(files)).toEqual(['sport-0003', 'music-0001', 'sport-0001', 'sport-0002'])
  })

  it('does not renumber imported questions when a new file sorts before them', () => {
    const pilot = { name: 'sport-pilot.json', items: [item('sport', 'sport-0001')] }
    const before = assignIds([pilot]).find((q) => q.question === 'Q?')!.id
    const withNewFile = ids([{ name: 'a-new.json', items: [item('sport')] }, pilot])
    expect(withNewFile).toContain(before)
    expect(withNewFile).toEqual(['sport-0002', 'sport-0001'])
  })
})
