// Regenerate the bundled Douay-Rheims search index and book table from a
// scrollmapper/bible_databases DRC.json file.
//
//   node tools/build-data.mjs path/to/DRC.json
//
// Writes:
//   data/bible.tsv    one verse per line:  "Book<TAB>chapter:verse<TAB>text"
//   data/books.json   canonical 73-book Catholic canon with abbreviations.
//
// The Douay-Rheims Challoner text is public domain. The five apocryphal
// appendices are dropped so the index matches the 73-book Catholic canon.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

// Canonical 73 books in order, keyed to the DRC.json `name` field.
const BOOKS = [
  { src: "Genesis", name: "Genesis", abbrev: "Gn", aliases: ["genesis", "gen"] },
  { src: "Exodus", name: "Exodus", abbrev: "Ex", aliases: ["exodus", "exo", "exod"] },
  { src: "Leviticus", name: "Leviticus", abbrev: "Lv", aliases: ["leviticus", "lev"] },
  { src: "Numbers", name: "Numbers", abbrev: "Nm", aliases: ["numbers", "num"] },
  { src: "Deuteronomy", name: "Deuteronomy", abbrev: "Dt", aliases: ["deuteronomy", "deut", "dt"] },
  { src: "Joshua", name: "Joshua", abbrev: "Jos", aliases: ["joshua", "josue", "jos"] },
  { src: "Judges", name: "Judges", abbrev: "Jgs", aliases: ["judges", "jdg", "jgs", "judg"] },
  { src: "Ruth", name: "Ruth", abbrev: "Ru", aliases: ["ruth", "rut"] },
  { src: "I Samuel", name: "1 Samuel", abbrev: "1 Sm", aliases: ["1 samuel", "first samuel", "i samuel", "1 sam"] },
  { src: "II Samuel", name: "2 Samuel", abbrev: "2 Sm", aliases: ["2 samuel", "second samuel", "ii samuel", "2 sam"] },
  { src: "I Kings", name: "1 Kings", abbrev: "1 Kgs", aliases: ["1 kings", "first kings", "i kings", "1 kgs"] },
  { src: "II Kings", name: "2 Kings", abbrev: "2 Kgs", aliases: ["2 kings", "second kings", "ii kings", "2 kgs"] },
  { src: "I Chronicles", name: "1 Chronicles", abbrev: "1 Chr", aliases: ["1 chronicles", "first chronicles", "i chronicles", "1 chr"] },
  { src: "II Chronicles", name: "2 Chronicles", abbrev: "2 Chr", aliases: ["2 chronicles", "second chronicles", "ii chronicles", "2 chr"] },
  { src: "Ezra", name: "Ezra", abbrev: "Ezr", aliases: ["ezra", "ezr"] },
  { src: "Nehemiah", name: "Nehemiah", abbrev: "Neh", aliases: ["nehemiah", "neh", "nehemias"] },
  { src: "Tobit", name: "Tobit", abbrev: "Tb", aliases: ["tobit", "tobias", "tob"] },
  { src: "Judith", name: "Judith", abbrev: "Jdt", aliases: ["judith", "jdt", "jdth"] },
  { src: "Esther", name: "Esther", abbrev: "Est", aliases: ["esther", "est"] },
  { src: "Job", name: "Job", abbrev: "Jb", aliases: ["job"] },
  { src: "Psalms", name: "Psalms", abbrev: "Ps", aliases: ["psalms", "psalm", "ps"] },
  { src: "Proverbs", name: "Proverbs", abbrev: "Prv", aliases: ["proverbs", "prov", "prv"] },
  { src: "Ecclesiastes", name: "Ecclesiastes", abbrev: "Eccl", aliases: ["ecclesiastes", "eccles", "eccl", "qoheleth"] },
  { src: "Song of Solomon", name: "Song of Songs", abbrev: "Sg", aliases: ["song of songs", "song of solomon", "canticle of canticles", "canticles", "songs"] },
  { src: "Wisdom", name: "Wisdom", abbrev: "Wis", aliases: ["wisdom", "wisdom of solomon", "wis"] },
  { src: "Sirach", name: "Sirach", abbrev: "Sir", aliases: ["sirach", "ecclesiasticus", "sir"] },
  { src: "Isaiah", name: "Isaiah", abbrev: "Is", aliases: ["isaiah", "isaias", "isa"] },
  { src: "Jeremiah", name: "Jeremiah", abbrev: "Jer", aliases: ["jeremiah", "jeremias", "jer"] },
  { src: "Lamentations", name: "Lamentations", abbrev: "Lam", aliases: ["lamentations", "lam"] },
  { src: "Baruch", name: "Baruch", abbrev: "Bar", aliases: ["baruch", "bar"] },
  { src: "Ezekiel", name: "Ezekiel", abbrev: "Ez", aliases: ["ezekiel", "ezechiel", "ezek", "eze"] },
  { src: "Daniel", name: "Daniel", abbrev: "Dn", aliases: ["daniel", "dan", "dn"] },
  { src: "Hosea", name: "Hosea", abbrev: "Hos", aliases: ["hosea", "osea", "osee", "hos"] },
  { src: "Joel", name: "Joel", abbrev: "Jl", aliases: ["joel", "jl"] },
  { src: "Amos", name: "Amos", abbrev: "Am", aliases: ["amos", "am"] },
  { src: "Obadiah", name: "Obadiah", abbrev: "Ob", aliases: ["obadiah", "abdias", "obad", "ob"] },
  { src: "Jonah", name: "Jonah", abbrev: "Jon", aliases: ["jonah", "jonas", "jon"] },
  { src: "Micah", name: "Micah", abbrev: "Mi", aliases: ["micah", "micheas", "mic"] },
  { src: "Nahum", name: "Nahum", abbrev: "Na", aliases: ["nahum", "nah"] },
  { src: "Habakkuk", name: "Habakkuk", abbrev: "Hb", aliases: ["habakkuk", "habacuc", "hab"] },
  { src: "Zephaniah", name: "Zephaniah", abbrev: "Zep", aliases: ["zephaniah", "sophonias", "sophoniah", "zeph"] },
  { src: "Haggai", name: "Haggai", abbrev: "Hg", aliases: ["haggai", "aggeus", "hag", "hg"] },
  { src: "Zechariah", name: "Zechariah", abbrev: "Zec", aliases: ["zechariah", "zacharias", "zech", "zec"] },
  { src: "Malachi", name: "Malachi", abbrev: "Mal", aliases: ["malachi", "malachias", "mal"] },
  { src: "I Maccabees", name: "1 Maccabees", abbrev: "1 Mc", aliases: ["1 maccabees", "first maccabees", "i maccabees", "1 mac"] },
  { src: "II Maccabees", name: "2 Maccabees", abbrev: "2 Mc", aliases: ["2 maccabees", "second maccabees", "ii maccabees", "2 mac"] },
  { src: "Matthew", name: "Matthew", abbrev: "Mt", aliases: ["matthew", "matt", "mt"] },
  { src: "Mark", name: "Mark", abbrev: "Mk", aliases: ["mark", "mk"] },
  { src: "Luke", name: "Luke", abbrev: "Lk", aliases: ["luke", "lk"] },
  { src: "John", name: "John", abbrev: "Jn", aliases: ["john", "jn", "joh"] },
  { src: "Acts", name: "Acts", abbrev: "Acts", aliases: ["acts", "acts of the apostles", "act"] },
  { src: "Romans", name: "Romans", abbrev: "Rom", aliases: ["romans", "rom"] },
  { src: "I Corinthians", name: "1 Corinthians", abbrev: "1 Cor", aliases: ["1 corinthians", "first corinthians", "i corinthians", "1 cor"] },
  { src: "II Corinthians", name: "2 Corinthians", abbrev: "2 Cor", aliases: ["2 corinthians", "second corinthians", "ii corinthians", "2 cor"] },
  { src: "Galatians", name: "Galatians", abbrev: "Gal", aliases: ["galatians", "gal"] },
  { src: "Ephesians", name: "Ephesians", abbrev: "Eph", aliases: ["ephesians", "eph"] },
  { src: "Philippians", name: "Philippians", abbrev: "Phil", aliases: ["philippians", "phil", "philip"] },
  { src: "Colossians", name: "Colossians", abbrev: "Col", aliases: ["colossians", "col"] },
  { src: "I Thessalonians", name: "1 Thessalonians", abbrev: "1 Thes", aliases: ["1 thessalonians", "first thessalonians", "i thessalonians", "1 thes", "1 thess"] },
  { src: "II Thessalonians", name: "2 Thessalonians", abbrev: "2 Thes", aliases: ["2 thessalonians", "second thessalonians", "ii thessalonians", "2 thes", "2 thess"] },
  { src: "I Timothy", name: "1 Timothy", abbrev: "1 Tm", aliases: ["1 timothy", "first timothy", "i timothy", "1 tim", "1 tm"] },
  { src: "II Timothy", name: "2 Timothy", abbrev: "2 Tm", aliases: ["2 timothy", "second timothy", "ii timothy", "2 tim", "2 tm"] },
  { src: "Titus", name: "Titus", abbrev: "Ti", aliases: ["titus", "tit", "ti"] },
  { src: "Philemon", name: "Philemon", abbrev: "Phlm", aliases: ["philemon", "philem", "phlm"] },
  { src: "Hebrews", name: "Hebrews", abbrev: "Heb", aliases: ["hebrews", "heb"] },
  { src: "James", name: "James", abbrev: "Jas", aliases: ["james", "jas", "jam"] },
  { src: "I Peter", name: "1 Peter", abbrev: "1 Pt", aliases: ["1 peter", "first peter", "i peter", "1 pet", "1 pt"] },
  { src: "II Peter", name: "2 Peter", abbrev: "2 Pt", aliases: ["2 peter", "second peter", "ii peter", "2 pet", "2 pt"] },
  { src: "I John", name: "1 John", abbrev: "1 Jn", aliases: ["1 john", "first john", "i john", "1 jn"] },
  { src: "II John", name: "2 John", abbrev: "2 Jn", aliases: ["2 john", "second john", "ii john", "2 jn"] },
  { src: "III John", name: "3 John", abbrev: "3 Jn", aliases: ["3 john", "third john", "iii john", "3 jn"] },
  { src: "Jude", name: "Jude", abbrev: "Jude", aliases: ["jude", "judas"] },
  { src: "Revelation of John", name: "Revelation", abbrev: "Rev", aliases: ["revelation", "revelations", "apocalypse", "rev"] },
]

const DROP = new Set([
  "Prayer of Manasses",
  "I Esdras",
  "II Esdras",
  "Additional Psalm",
  "Laodiceans",
])

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim()
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error("usage: node tools/build-data.mjs path/to/DRC.json")
    process.exit(2)
  }

  const bible = JSON.parse(readFileSync(input, "utf8"))
  const bySrc = new Map(BOOKS.map((b) => [b.src, b]))

  const lines = []
  let verseCount = 0
  let bookCount = 0

  for (const book of bible.books || []) {
    if (DROP.has(book.name)) continue
    const canon = bySrc.get(book.name)
    if (!canon) {
      console.error("warning: unknown book, skipping:", book.name)
      continue
    }
    bookCount++
    for (const chapter of book.chapters || []) {
      for (const verse of chapter.verses || []) {
        const text = clean(verse.text)
        if (!text) continue
        lines.push(`${canon.name}\t${chapter.chapter}:${verse.verse}\t${text}`)
        verseCount++
      }
    }
  }

  const booksMeta = BOOKS.map((b) => ({ name: b.name, abbrev: b.abbrev, aliases: b.aliases }))

  mkdirSync(join(ROOT, "data"), { recursive: true })
  writeFileSync(join(ROOT, "data", "bible.tsv"), lines.join("\n") + "\n")
  writeFileSync(join(ROOT, "data", "books.json"), JSON.stringify(booksMeta, null, 2) + "\n")

  console.log(`wrote data/bible.tsv (${bookCount} books, ${verseCount} verses)`)
  console.log(`wrote data/books.json (${booksMeta.length} books)`)
}

main()
