// Unit tests for Model.js. Run with: node tests/model.test.js
const assert = require("assert")
const Model = require("../Model.js")

function test(name, fn) {
  try { fn(); console.log("ok - " + name) }
  catch (e) { console.error("FAIL - " + name); console.error(e); process.exitCode = 1 }
}

test("easter 2026", () => assert.strictEqual(Model.isoDate(Model.easterDate(2026)), "2026-04-05"))
test("easter 2024", () => assert.strictEqual(Model.isoDate(Model.easterDate(2024)), "2024-03-31"))
test("advent sunday 2026", () => {
  const d = Model.adventSunday(2026)
  assert.strictEqual(d.getDay(), 0)
  assert.strictEqual(Model.isoDate(d), "2026-11-29")
})

test("christmas is christmas season", () => {
  const day = Model.liturgicalDay(new Date(2026, 11, 25))
  assert.strictEqual(day.seasonKey, "christmas")
})

test("ash wednesday 2026", () => {
  const day = Model.liturgicalDay(new Date(2026, 1, 18))
  assert.strictEqual(day.seasonKey, "lent")
  assert.ok(day.spoken.indexOf("Ash Wednesday") === 0)
})

test("easter sunday 2026", () => {
  const day = Model.liturgicalDay(new Date(2026, 3, 5))
  assert.strictEqual(day.seasonKey, "easter")
})

test("advent weekday", () => {
  const day = Model.liturgicalDay(new Date(2026, 11, 1))
  assert.strictEqual(day.seasonKey, "advent")
})

test("schedule picks current hour", () => {
  const sched = Model.scheduleState(new Date(2026, 7, 23, 12, 30), {})
  assert.strictEqual(sched.current.id, "daytime")
  assert.strictEqual(sched.next.id, "evening")
})

test("schedule wraps to next morning", () => {
  const sched = Model.scheduleState(new Date(2026, 7, 23, 23, 0), {})
  assert.strictEqual(sched.current.id, "night")
  assert.strictEqual(sched.next.id, "morning")
  assert.strictEqual(sched.next.tomorrow, true)
})

test("build office has expected sections", () => {
  const book = {
    opening: "O God, come to my assistance.",
    glory: "Glory be.",
    hymns: { morning: "hymn" },
    psalms: { "94": "Come let us praise the Lord" },
    psalmOrder: { morning: [94] },
    canticles: { benedictus: "Blessed be the Lord God of Israel" },
    readings: { morning: [{ ref: "Rom 8:28", text: "all things work" }] },
    intercessions: { morning: ["prayer 1"] },
    ourFather: "Our Father",
    collects: { morning: ["collect a"] },
    dismissals: { morning: "go in peace" }
  }
  const office = Model.buildOffice(new Date(2026, 7, 23, 7, 0), Model.hourById("morning"), book)
  const labels = office.sections.map((s) => s.label)
  assert.ok(labels.indexOf("Opening") >= 0)
  assert.ok(labels.indexOf("Canticle of Zechariah") >= 0)
  assert.ok(labels.indexOf("The Lord's Prayer") >= 0)
  assert.strictEqual(office.hourName, "Morning Prayer — Laudes")
})

console.log("done")
