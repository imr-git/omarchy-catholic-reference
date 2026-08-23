// Pure reference math for the Catholic Reference widget. Locale- and Qt-free
// so it can be unit tested under node (tests/model.test.js).
//
// The bundled office is an abbreviated Liturgy of the Hours for personal
// devotion; the liturgical calendar below is a simplified approximation of
// the General Roman Calendar (Ordinary Form).

var HOURS = [
  { id: "morning", name: "Morning Prayer", shortName: "Lauds", latin: "Laudes", traditional: "Dawn", defaultTime: "06:30" },
  { id: "daytime", name: "Daytime Prayer", shortName: "Daytime", latin: "Terce·Sext·None", traditional: "Midday", defaultTime: "12:00" },
  { id: "evening", name: "Evening Prayer", shortName: "Vespers", latin: "Vesperae", traditional: "Sunset", defaultTime: "18:00" },
  { id: "night", name: "Night Prayer", shortName: "Compline", latin: "Completorium", traditional: "Before bed", defaultTime: "21:00" }
]

var WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

var ORDINALS = [
  "", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh",
  "Eighth", "Ninth", "Tenth", "Eleventh", "Twelfth", "Thirteenth",
  "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth",
  "Nineteenth", "Twentieth", "Twenty-first", "Twenty-second",
  "Twenty-third", "Twenty-fourth", "Twenty-fifth", "Twenty-sixth",
  "Twenty-seventh", "Twenty-eighth", "Twenty-ninth", "Thirtieth",
  "Thirty-first", "Thirty-second", "Thirty-third", "Thirty-fourth"
]

// Fixed solemnities (month-day -> name). A simplified subset of the
// General Roman Calendar.
var FIXED_FEASTS = {
  "1-1": "Mary, the Holy Mother of God",
  "1-6": "The Epiphany of the Lord",
  "3-19": "Saint Joseph, Spouse of the Blessed Virgin Mary",
  "3-25": "The Annunciation of the Lord",
  "6-24": "The Nativity of Saint John the Baptist",
  "6-29": "Saints Peter and Paul, Apostles",
  "8-6": "The Transfiguration of the Lord",
  "8-15": "The Assumption of the Blessed Virgin Mary",
  "9-8": "The Nativity of the Blessed Virgin Mary",
  "9-14": "The Exaltation of the Holy Cross",
  "9-29": "Saints Michael, Gabriel and Raphael, Archangels",
  "11-1": "All Saints",
  "11-2": "All Souls",
  "12-8": "The Immaculate Conception of the Blessed Virgin Mary",
  "12-25": "The Nativity of the Lord",
  "12-26": "Saint Stephen, the First Martyr",
  "12-27": "Saint John, Apostle and Evangelist",
  "12-28": "The Holy Innocents, Martyrs"
}

// --- date helpers ---------------------------------------------------------

function pad2(n) { return n < 10 ? "0" + n : String(n) }

function dateAt(year, month, day) { return new Date(year, month - 1, day) }

function addDays(d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n) }

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()) }

function isoDate(d) { return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) }

function daysBetween(a, b) { return Math.round((startOfDay(b) - startOfDay(a)) / 86400000) }

function sundayOnOrBefore(d) { return addDays(d, -d.getDay()) }

function ordinal(n) { return ORDINALS[n] || String(n) }

// Gregorian Easter (Meeus/Jones/Butcher), public domain algorithm.
function easterDate(year) {
  var a = year % 19
  var b = Math.floor(year / 100)
  var c = year % 100
  var d = Math.floor(b / 4)
  var e = b % 4
  var f = Math.floor((b + 8) / 25)
  var g = Math.floor((b - f + 1) / 3)
  var h = (19 * a + b - d - g + 15) % 30
  var i = Math.floor(c / 4)
  var k = c % 4
  var l = (32 + 2 * e + 2 * i - h - k) % 7
  var m = Math.floor((a + 11 * h + 22 * l) / 451)
  var monthDay = h + l - 7 * m + 114
  return dateAt(year, Math.floor(monthDay / 31), (monthDay % 31) + 1)
}

// First Sunday of Advent: the Sunday on or after November 27.
function adventSunday(year) {
  var d = dateAt(year, 11, 27)
  for (var i = 0; i < 7; i++) {
    var c = addDays(d, i)
    if (c.getDay() === 0) return c
  }
  return d
}

// The liturgical year that a date belongs to (Advent starts the new year).
function liturgicalYear(d) {
  var advent = adventSunday(d.getFullYear())
  return daysBetween(advent, d) >= 0 ? d.getFullYear() + 1 : d.getFullYear()
}

// --- hour schedule --------------------------------------------------------

function parseHm(value, fallback) {
  var m = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return fallback || "06:00"
  var h = parseInt(m[1], 10)
  var min = parseInt(m[2], 10)
  if (h > 23 || min > 59) return fallback || "06:00"
  return pad2(h) + ":" + pad2(min)
}

function minutesFromHm(value) {
  var parts = parseHm(value, "00:00").split(":")
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10)
}

function minutesOfDay(date) { return date.getHours() * 60 + date.getMinutes() }

function formatUntil(fromMin, toMin, tomorrow) {
  var delta = toMin - fromMin
  if (tomorrow) delta += 24 * 60
  if (delta < 0) delta += 24 * 60
  if (delta === 0) return "now"
  if (delta === 1) return "in 1 min"
  if (delta < 60) return "in " + delta + " min"
  var h = Math.floor(delta / 60)
  var m = delta % 60
  if (m === 0) return h === 1 ? "in 1 hour" : "in " + h + " hours"
  return "in " + h + "h " + m + "m"
}

function hourById(id) {
  for (var i = 0; i < HOURS.length; i++) if (HOURS[i].id === id) return HOURS[i]
  return null
}

function resolvedHours(settings) {
  settings = settings || {}
  return HOURS.map(function(hour) {
    var time = parseHm(settings && settings[hour.id + "Time"], hour.defaultTime)
    return {
      id: hour.id,
      name: hour.name,
      shortName: hour.shortName,
      latin: hour.latin,
      traditional: hour.traditional,
      time: time,
      minutes: minutesFromHm(time),
      tomorrow: false
    }
  })
}

function scheduleState(now, settings) {
  var hours = resolvedHours(settings).slice().sort(function(a, b) { return a.minutes - b.minutes })
  var nowMin = minutesOfDay(now)
  var current = null
  var next = null
  for (var i = 0; i < hours.length; i++) {
    if (hours[i].minutes <= nowMin) current = hours[i]
    else if (!next) next = hours[i]
  }
  if (!next && hours.length > 0) {
    next = {
      id: hours[0].id,
      name: hours[0].name,
      shortName: hours[0].shortName,
      latin: hours[0].latin,
      traditional: hours[0].traditional,
      time: hours[0].time,
      minutes: hours[0].minutes,
      tomorrow: true
    }
  }
  return { hours: hours, all: resolvedHours(settings), current: current, next: next, nowMinutes: nowMin }
}

function featuredHour(schedule) {
  if (!schedule) return null
  return schedule.current || schedule.next || null
}

function heroMeta(hour) {
  if (!hour) return ""
  return hour.shortName + " · " + hour.traditional + " · " + hour.time
}

// --- liturgical calendar --------------------------------------------------

function liturgicalDay(d) {
  d = startOfDay(d)
  var lyr = liturgicalYear(d)
  var easter = easterDate(lyr)
  var advent = adventSunday(lyr - 1)              // Advent that began this liturgical year
  var christmasPrev = dateAt(lyr - 1, 12, 25)     // Christmas that began this year
  var epiphany = dateAt(lyr, 1, 6)
  var baptism = addDays(epiphany, (7 - epiphany.getDay()) % 7) // Sunday after Epiphany
  var nextAdvent = adventSunday(lyr)              // Advent that ends this year

  var ash = addDays(easter, -46)
  var palm = addDays(easter, -7)
  var maundy = addDays(easter, -3)
  var goodFriday = addDays(easter, -2)
  var holySaturday = addDays(easter, -1)
  var ascension = addDays(easter, 39)
  var pentecost = addDays(easter, 49)
  var trinity = addDays(easter, 56)
  var corpus = addDays(easter, 63)
  var sacredHeart = addDays(easter, 68)
  var christKing = addDays(nextAdvent, -7)

  var wd = WEEKDAYS[d.getDay()]
  var md = (d.getMonth() + 1) + "-" + d.getDate()
  var feast = FIXED_FEASTS[md] || null

  function eq(a, b) { return daysBetween(a, b) === 0 }
  function ge(a) { return daysBetween(a, d) >= 0 }   // d >= a
  function gt(a) { return daysBetween(a, d) > 0 }    // d > a
  function le(b) { return daysBetween(d, b) >= 0 }   // d <= b
  function lt(b) { return daysBetween(d, b) > 0 }    // d < b

  // Movable solemnities.
  if (eq(d, ascension)) feast = "The Ascension of the Lord"
  else if (eq(d, pentecost)) feast = "Pentecost Sunday"
  else if (eq(d, trinity)) feast = "The Most Holy Trinity"
  else if (eq(d, corpus)) feast = "The Most Holy Body and Blood of Christ"
  else if (eq(d, sacredHeart)) feast = "The Most Sacred Heart of Jesus"
  else if (eq(d, christKing)) feast = "Our Lord Jesus Christ, King of the Universe"

  var seasonKey = "ordinary"
  var weekNumber = null
  var season = "Ordinary Time"

  if (ge(advent) && lt(christmasPrev)) {
    seasonKey = "advent"
    season = "Advent"
    var nAdv = Math.floor(daysBetween(advent, sundayOnOrBefore(d)) / 7) + 1
    if (d.getDay() === 0) season = ordinal(nAdv) + " Sunday of Advent"
    else season = wd + " of the " + ordinal(nAdv) + " Week of Advent"
    weekNumber = nAdv
  } else if (ge(christmasPrev) && le(baptism)) {
    seasonKey = "christmas"
    season = "Christmas Season"
    if (eq(d, christmasPrev)) season = "The Nativity of the Lord"
    else if (eq(d, epiphany)) season = "The Epiphany of the Lord"
    else if (eq(d, baptism)) season = "The Baptism of the Lord"
    else if (d.getDay() === 0) season = "The Holy Family of Jesus, Mary and Joseph"
    else season = wd + " in the Christmas Season"
  } else if (gt(baptism) && lt(ash)) {
    seasonKey = "ordinary"
    season = d.getDay() === 0 ? "Sunday in Ordinary Time" : wd + " in Ordinary Time"
  } else if (ge(ash) && lt(maundy)) {
    seasonKey = "lent"
    season = "Lent"
    if (eq(d, ash)) season = "Ash Wednesday"
    else if (eq(d, palm)) season = "Palm Sunday of the Passion of the Lord"
    else {
      var nLent = Math.floor(daysBetween(ash, sundayOnOrBefore(d)) / 7)
      if (d.getDay() === 0) season = ordinal(nLent) + " Sunday of Lent"
      else season = wd + " of the " + ordinal(nLent) + " Week of Lent"
      weekNumber = nLent
    }
  } else if (ge(maundy) && le(holySaturday)) {
    seasonKey = "triduum"
    season = "Easter Triduum"
    if (eq(d, maundy)) season = "Holy Thursday"
    else if (eq(d, goodFriday)) season = "Good Friday of the Lord's Passion"
    else season = "Holy Saturday"
  } else if (ge(easter) && le(pentecost)) {
    seasonKey = "easter"
    season = "Easter Season"
    if (eq(d, easter)) season = "Easter Sunday of the Resurrection of the Lord"
    else if (eq(d, pentecost)) season = "Pentecost Sunday"
    else {
      var nEast = Math.floor(daysBetween(easter, sundayOnOrBefore(d)) / 7) + 1
      if (d.getDay() === 0) season = ordinal(nEast) + " Sunday of Easter"
      else season = wd + " of the " + ordinal(nEast) + " Week of Easter"
      weekNumber = nEast
    }
  } else {
    // Ordinary Time after Pentecost (until next Advent).
    seasonKey = "ordinary"
    season = d.getDay() === 0 ? "Sunday in Ordinary Time" : wd + " in Ordinary Time"
  }

  var spoken = feast ? feast : season

  return {
    date: isoDate(d),
    weekday: wd,
    seasonKey: seasonKey,
    weekNumber: weekNumber,
    feast: feast,
    season: season,
    spoken: spoken
  }
}

// Sunday cycle A/B/C and weekday cycle I/II of the Roman Lectionary.
function lectionaryCycle(date) {
  var lyr = liturgicalYear(date)
  var sunday = ["C", "A", "B"][lyr % 3]
  var weekday = lyr % 2 === 0 ? "II" : "I"
  return {
    sunday: sunday,
    weekday: weekday,
    year: lyr,
    label: "Year " + sunday + " · Weekday " + weekday
  }
}

// --- office builder -------------------------------------------------------

function canticleForHour(hourId) {
  if (hourId === "morning") return { id: "benedictus", label: "Canticle of Zechariah" }
  if (hourId === "evening") return { id: "magnificat", label: "Canticle of Mary" }
  if (hourId === "night") return { id: "nuncDimittis", label: "Canticle of Simeon" }
  return null
}

function pickFrom(list, weekday) {
  if (!list || list.length === 0) return null
  return list[weekday % list.length]
}

function buildOffice(now, hour, book) {
  book = book || {}
  var day = liturgicalDay(now)
  hour = hour || hourById("morning")
  var weekday = now.getDay()
  var sections = []

  if (book.opening) {
    sections.push({ label: "Opening", body: book.opening + (book.glory ? "\n" + book.glory : "") })
  }

  if (book.hymns && book.hymns[hour.id]) {
    sections.push({ label: "Hymn", body: book.hymns[hour.id] })
  }

  var psalmNum = pickFrom(book.psalmOrder && book.psalmOrder[hour.id], weekday)
  if (psalmNum && book.psalms && book.psalms[String(psalmNum)]) {
    sections.push({ label: "Psalm " + psalmNum, body: book.psalms[String(psalmNum)] })
  }

  var canticle = canticleForHour(hour.id)
  if (canticle && book.canticles && book.canticles[canticle.id]) {
    sections.push({ label: canticle.label, body: book.canticles[canticle.id] })
  }

  var reading = pickFrom(book.readings && book.readings[hour.id], weekday)
  if (reading && reading.text) {
    sections.push({ label: "The Reading", body: reading.ref + "\n" + reading.text })
  }

  var intercessions = book.intercessions && book.intercessions[hour.id]
  if (intercessions && intercessions.length) {
    sections.push({ label: "Intercessions", body: intercessions.join("\n") })
  }

  if (book.ourFather) {
    sections.push({ label: "The Lord's Prayer", body: book.ourFather })
  }

  var collect = pickFrom(book.collects && book.collects[hour.id], weekday)
  if (collect) {
    sections.push({ label: "Collect", body: collect })
  }

  if (book.dismissals && book.dismissals[hour.id]) {
    sections.push({ label: "Dismissal", body: book.dismissals[hour.id] })
  }

  return {
    heading: day.spoken,
    feast: day.feast,
    seasonKey: day.seasonKey,
    hourId: hour.id,
    hourName: hour.name + " — " + hour.latin,
    sections: sections
  }
}

if (typeof module !== "undefined") {
  module.exports = {
    HOURS: HOURS,
    pad2: pad2,
    isoDate: isoDate,
    minutesOfDay: minutesOfDay,
    parseHm: parseHm,
    minutesFromHm: minutesFromHm,
    formatUntil: formatUntil,
    hourById: hourById,
    resolvedHours: resolvedHours,
    scheduleState: scheduleState,
    featuredHour: featuredHour,
    heroMeta: heroMeta,
    easterDate: easterDate,
    adventSunday: adventSunday,
    liturgicalDay: liturgicalDay,
    lectionaryCycle: lectionaryCycle,
    buildOffice: buildOffice
  }
}
