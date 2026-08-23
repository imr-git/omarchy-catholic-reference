// Build data/office.json: the bundled Catholic Liturgy of the Hours content.
//
//   node tools/build-office.mjs path/to/DRC.json
//
// Psalms, Gospel canticles, and short readings are extracted verbatim from
// the public-domain Douay-Rheims text so the office never needs a network
// request. Psalm numbers are the Douay-Rheims (Vulgate) numbering.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")

// Douay-Rheims (Vulgate) psalm numbers for the weekly rotation.
const PSALM_ORDER = {
  morning: [94, 62, 50, 147, 8, 66, 112],
  daytime: [14, 22, 120, 24, 119, 129, 126],
  evening: [109, 137, 132, 116, 23, 83, 142],
  night: [4, 90, 129],
}

const CANTICLES = {
  benedictus: { book: "Luke", chapter: 1, from: 68, to: 79 },
  magnificat: { book: "Luke", chapter: 1, from: 46, to: 55 },
  nuncDimittis: { book: "Luke", chapter: 2, from: 29, to: 32 },
}

// Short readings, one per weekday (index = Date.getDay(), 0 = Sunday).
const READINGS = {
  morning: [
    { ref: "Romans 8:28", book: "Romans", chapter: 8, from: 28, to: 28 },
    { ref: "1 Thessalonians 5:16-18", book: "I Thessalonians", chapter: 5, from: 16, to: 18 },
    { ref: "Philippians 4:4-5", book: "Philippians", chapter: 4, from: 4, to: 5 },
    { ref: "Colossians 3:16-17", book: "Colossians", chapter: 3, from: 16, to: 17 },
    { ref: "Ephesians 5:19-20", book: "Ephesians", chapter: 5, from: 19, to: 20 },
    { ref: "Hebrews 13:15", book: "Hebrews", chapter: 13, from: 15, to: 15 },
    { ref: "1 Peter 5:6-7", book: "I Peter", chapter: 5, from: 6, to: 7 },
  ],
  daytime: [
    { ref: "Matthew 11:28", book: "Matthew", chapter: 11, from: 28, to: 28 },
    { ref: "Matthew 7:7", book: "Matthew", chapter: 7, from: 7, to: 7 },
    { ref: "John 15:5", book: "John", chapter: 15, from: 5, to: 5 },
    { ref: "Colossians 3:17", book: "Colossians", chapter: 3, from: 17, to: 17 },
    { ref: "1 Corinthians 10:31", book: "I Corinthians", chapter: 10, from: 31, to: 31 },
    { ref: "Galatians 6:9", book: "Galatians", chapter: 6, from: 9, to: 9 },
    { ref: "Philippians 4:13", book: "Philippians", chapter: 4, from: 13, to: 13 },
  ],
  evening: [
    { ref: "Romans 13:11-12", book: "Romans", chapter: 13, from: 11, to: 12 },
    { ref: "1 Peter 5:8-9", book: "I Peter", chapter: 5, from: 8, to: 9 },
    { ref: "Philippians 4:6-7", book: "Philippians", chapter: 4, from: 6, to: 7 },
    { ref: "James 4:8", book: "James", chapter: 4, from: 8, to: 8 },
    { ref: "Luke 24:29", book: "Luke", chapter: 24, from: 29, to: 29 },
    { ref: "2 Corinthians 4:6", book: "II Corinthians", chapter: 4, from: 6, to: 6 },
    { ref: "Matthew 11:28-30", book: "Matthew", chapter: 11, from: 28, to: 30 },
  ],
  night: [
    { ref: "1 Peter 5:7", book: "I Peter", chapter: 5, from: 7, to: 7 },
    { ref: "Matthew 11:29-30", book: "Matthew", chapter: 11, from: 29, to: 30 },
    { ref: "2 Corinthians 13:13", book: "II Corinthians", chapter: 13, from: 13, to: 13 },
  ],
}

const COMMON = {
  opening: "O God, come to my assistance. O Lord, make haste to help me.",
  glory: "Glory be to the Father, and to the Son, and to the Holy Ghost. As it was in the beginning, is now, and ever shall be, world without end. Amen.",
  ourFather: "Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.",
}

const HYMNS = {
  morning: "As morning breaks, we praise the Lord; his light has risen upon us.",
  daytime: "Come, Holy Spirit, fill the hearts of your faithful.",
  evening: "Let my prayer rise before you as incense, O Lord, as the evening sacrifice.",
  night: "Before the close of day, we ask, O Lord, for a quiet night and a perfect end.",
}

const INTERCESSIONS = {
  morning: [
    "You have given us this new day; help us to use it for your glory.",
    "Guide the Church in holiness, and give her pastors wisdom and courage.",
    "Bless our family, our friends, and all who labor this day.",
  ],
  evening: [
    "For the Church and for all who proclaim the Gospel, we pray to the Lord.",
    "For the sick, the lonely, and the dying, that they may know your comfort.",
    "For the departed, that they may rest in peace, we pray to the Lord.",
  ],
}

// One collect per weekday (index = Date.getDay(), 0 = Sunday).
const COLLECTS = {
  morning: [
    "O Lord our God, who on the first day of the week raised your Son from the dead: grant that, risen with him, we may walk this day in newness of life. Through Christ our Lord. Amen.",
    "Almighty God, as the morning light dawns, direct our thoughts, our words, and our works, that in all things we may serve you and give you praise. Through Christ our Lord. Amen.",
    "Father of mercies, pour out upon us the Spirit of wisdom, that we may know and do your will throughout this day. Through Christ our Lord. Amen.",
    "O God, who taught us to cast all our care upon you: keep us in your peace, and order our steps according to your word. Through Christ our Lord. Amen.",
    "Lord Jesus Christ, true light of the world: shine in our hearts, and make us faithful witnesses of your love. Amen.",
    "Almighty and merciful God, who spared not your only Son: grant that we may take up our cross and follow him in love. Through Christ our Lord. Amen.",
    "O God, who rested on the seventh day: grant us a holy rest in you, and bring us to the eternal sabbath of your kingdom. Through Christ our Lord. Amen.",
  ],
  daytime: [
    "O God, from whom all holy desires and good works proceed: direct our work this hour, and keep us diligent in your service. Through Christ our Lord. Amen.",
    "Lord, at the third hour you sent the Holy Spirit upon your apostles: fill our hearts with that same Spirit. Through Christ our Lord. Amen.",
    "At noon you hung upon the cross, O Christ: keep us steadfast in your passion, that we may share your glory. Amen.",
    "O God, who see all our labor: bless the work of our hands, and make it fruitful for your kingdom. Through Christ our Lord. Amen.",
    "Grant, O Lord, that we who labor may do so in faith, hope, and charity, offering all our works to you. Through Christ our Lord. Amen.",
    "At the sixth hour darkness covered the earth: enlighten our minds, O God, with the light of your truth. Through Christ our Lord. Amen.",
    "Keep us, Lord, in your love through the midst of this day, and bring us in safety to its close. Through Christ our Lord. Amen.",
  ],
  evening: [
    "Stay with us, Lord, for evening draws near: kindle in our hearts the hope of the resurrection. Through Christ our Lord. Amen.",
    "O God, who have brought us to the evening of this day: accept the sacrifice of our praise, and forgive what we have done amiss. Through Christ our Lord. Amen.",
    "Let our evening prayer rise before you as incense, O Lord, and the lifting of our hands as the evening sacrifice. Through Christ our Lord. Amen.",
    "Visit this house, we pray, O Lord, and drive far from it all snares of the enemy: let your holy angels dwell herein to keep us in peace. Through Christ our Lord. Amen.",
    "Lighten our darkness, we beseech you, O Lord; and by your great mercy defend us from all perils and dangers of this night. Through Christ our Lord. Amen.",
    "O God, who are ever faithful: receive our evening praise, and grant us a night of peaceful rest. Through Christ our Lord. Amen.",
    "Grant, O Lord, that we, who this day have shared in the labor of your people, may rest in you this night. Through Christ our Lord. Amen.",
  ],
  night: [
    "Visit this dwelling, O Lord, and grant that we who pray may be guarded by your angels throughout this night. Through Christ our Lord. Amen.",
    "Keep us, O Lord, as the apple of your eye, and hide us under the shadow of your wings. Through Christ our Lord. Amen.",
    "Into your hands, O Lord, we commend our spirits; keep us in peace through the watches of this night. Through Christ our Lord. Amen.",
    "Grant us a quiet night, O Lord, and a perfect end. Through Christ our Lord. Amen.",
    "May the all-powerful Lord grant us a restful night and a sinless end. Amen.",
    "Lord Jesus, who slept in the boat and calmed the storm: still the anxieties of our hearts, that we may rest in you. Amen.",
    "O God, our refuge and strength: abide with us this night, and raise us up in the morning to serve you anew. Through Christ our Lord. Amen.",
  ],
}

const DISMISSALS = {
  morning: "May the Lord bless us, protect us from all evil, and bring us to everlasting life. Amen.",
  daytime: "Let us go in peace, to love and serve the Lord. Amen.",
  evening: "May the Lord grant us a quiet night and a perfect end. Amen.",
  night: "May the almighty Lord grant us a restful night and a sinless end. Amen.",
}

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim()
}

function main() {
  const input = process.argv[2]
  if (!input) {
    console.error("usage: node tools/build-office.mjs path/to/DRC.json")
    process.exit(2)
  }
  const bible = JSON.parse(readFileSync(input, "utf8"))
  const books = {}
  for (const b of bible.books || []) books[b.name] = b

  function verseText(book, chapter, verse) {
    const b = books[book]
    if (!b) return ""
    const ch = (b.chapters || []).find((c) => c.chapter === chapter)
    if (!ch) return ""
    const v = (ch.verses || []).find((x) => x.verse === verse)
    return v ? clean(v.text) : ""
  }

  function rangeText(book, chapter, from, to) {
    const out = []
    for (let v = from; v <= to; v++) out.push(verseText(book, chapter, v))
    return clean(out.filter(Boolean).join(" "))
  }

  function psalmChapter(n) {
    const b = books["Psalms"]
    if (!b) return ""
    const ch = (b.chapters || []).find((c) => c.chapter === n)
    if (!ch) return ""
    return clean((ch.verses || []).map((v) => clean(v.text)).join(" "))
  }

  const psalms = {}
  for (const key of Object.keys(PSALM_ORDER)) {
    for (const n of PSALM_ORDER[key]) {
      if (!(n in psalms)) psalms[n] = psalmChapter(n)
    }
  }

  const canticles = {}
  for (const key of Object.keys(CANTICLES)) {
    const spec = CANTICLES[key]
    canticles[key] = rangeText(spec.book, spec.chapter, spec.from, spec.to)
  }

  const readings = {}
  for (const hour of Object.keys(READINGS)) {
    readings[hour] = READINGS[hour].map((r) => ({
      ref: r.ref,
      text: rangeText(r.book, r.chapter, r.from, r.to),
    }))
  }

  const office = {
    opening: COMMON.opening,
    glory: COMMON.glory,
    ourFather: COMMON.ourFather,
    hymns: HYMNS,
    intercessions: INTERCESSIONS,
    collects: COLLECTS,
    dismissals: DISMISSALS,
    canticles,
    psalms,
    psalmOrder: PSALM_ORDER,
    readings,
  }

  mkdirSync(join(ROOT, "data"), { recursive: true })
  writeFileSync(join(ROOT, "data", "office.json"), JSON.stringify(office, null, 2) + "\n")

  const psalmCount = Object.keys(psalms).length
  console.log(`wrote data/office.json (${psalmCount} psalms, ${Object.keys(canticles).length} canticles)`)
}

main()
