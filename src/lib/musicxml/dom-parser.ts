// Loop 019 — the one file in this directory that names a browser global.
//
// `readScoreFromMxl` takes its XML parser as an argument precisely so that
// nothing else here has to know where it is running. This is the adapter a
// browser caller passes: Loop 020's file picker will import it, hand it to
// `readScoreFromMxl` alongside the bytes it read from the drop, and nothing
// in the parse or the validation ever learns a `window` exists.

import type { XmlParser } from './read-score.ts'

export const parseXmlWithDomParser: XmlParser = (xmlText) =>
  new DOMParser().parseFromString(xmlText, 'application/xml')
