import assert from 'node:assert/strict'

import { buildCloze, pickCardMode } from '../lib/flashcards-cloze.ts'

// buildCloze blanks the word (case-insensitive, word-boundary)
assert.equal(buildCloze('I need to vent my frustration.', 'vent'), 'I need to _____ my frustration.')
assert.equal(buildCloze('She is Venting again.', 'venting'), 'She is _____ again.')
assert.equal(buildCloze('They keep nitpicking and nitpicking.', 'nitpicking'), 'They keep _____ and _____.')

// null when word not present or inputs missing
assert.equal(buildCloze('A different sentence.', 'vent'), null)
assert.equal(buildCloze('', 'vent'), null)
assert.equal(buildCloze('Some example', ''), null)
assert.equal(buildCloze(null, 'vent'), null)

// does not partial-match inside another word
assert.equal(buildCloze('The event was great.', 'vent'), null)

// pickCardMode rotation
assert.equal(pickCardMode(0, true), 'standard')
assert.equal(pickCardMode(1, true), 'cloze')
assert.equal(pickCardMode(1, false), 'standard') // no cloze available → standard
assert.equal(pickCardMode(2, true), 'audio')
assert.equal(pickCardMode(2, false), 'audio')

console.log('flashcards-cloze tests passed')
