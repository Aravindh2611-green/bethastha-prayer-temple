export const TIME_ZONE = 'Asia/Kolkata'
const DAY_MS = 24 * 60 * 60 * 1000

export function getIstDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function keyForDate(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function getWeekday(key) {
  return dateFromKey(key).getUTCDay()
}

export function addDays(key, amount) {
  const date = dateFromKey(key)
  date.setUTCDate(date.getUTCDate() + amount)
  return keyForDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function lastSaturday(year, monthIndex) {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0))
  const daysBack = (lastDay.getUTCDay() - 6 + 7) % 7
  return keyForDate(year, monthIndex, lastDay.getUTCDate() - daysBack)
}

export function firstSunday(year, monthIndex) {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1))
  const daysForward = (7 - firstDay.getUTCDay()) % 7
  return keyForDate(year, monthIndex, 1 + daysForward)
}

export function easterSunday(year) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return keyForDate(year, month - 1, day)
}

export function festivalDates(year) {
  const easter = easterSunday(year)
  return [
    { id: 'newYear', date: keyForDate(year, 0, 1) },
    { id: 'palmSunday', date: addDays(easter, -7) },
    { id: 'maundyThursday', date: addDays(easter, -3) },
    { id: 'goodFriday', date: addDays(easter, -2) },
    { id: 'easter', date: easter },
    { id: 'pentecost', date: addDays(easter, 49) },
    { id: 'christmas', date: keyForDate(year, 11, 25) },
  ]
}

export function getFestivalTheme(dateKey, settings = {}) {
  const [year] = dateKey.split('-').map(Number)
  const candidates = [year - 1, year, year + 1]
    .flatMap(festivalDates)
    .filter(({ id }) => settings[id]?.enabled !== false)
    .map((festival) => {
      const options = settings[festival.id] ?? {}
      const date = options.date?.slice(0, 4) === festival.date.slice(0, 4) ? options.date : festival.date
      const start = options.startDate || addDays(date, -(options.daysBefore ?? defaultWindow(festival.id).before))
      const end = options.endDate || addDays(date, options.daysAfter ?? defaultWindow(festival.id).after)
      return { ...festival, date, start, end }
    })
    .filter(({ start, end }) => dateKey >= start && dateKey <= end)
  return candidates.sort((a, b) => a.date.localeCompare(b.date))[0]?.id ?? 'normal'
}

function defaultWindow(id) {
  return id === 'christmas' ? { before: 5, after: 1 } : { before: 0, after: 0 }
}

function localizedTime(time, language) {
  const [hour, minute] = time.split(':').map(Number)
  if (language === 'ta') {
    const period = hour < 12 ? 'காலை' : hour < 16 ? 'பிற்பகல்' : 'மாலை'
    const shownHour = hour % 12 || 12
    return `${period} ${String(shownHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  }
  const date = new Date(Date.UTC(2020, 0, 1, hour, minute))
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(date)
}

export function formatTimeRange(start, end, language) {
  return `${localizedTime(start, language)} – ${localizedTime(end, language)}`
}

export function formatDate(key, language, options = {}) {
  return new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', {
    weekday: options.weekday ?? 'long',
    day: 'numeric',
    month: options.month ?? 'long',
    year: options.year ?? 'numeric',
    timeZone: 'UTC',
  }).format(dateFromKey(key))
}

export function formatMonth(year, monthIndex, language) {
  return new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, monthIndex, 1)))
}

export function formatClock(date, language) {
  return new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: language !== 'ta',
    timeZone: TIME_ZONE,
  }).format(date)
}

export function scheduleEvents(year, monthIndex, config) {
  const events = []
  const monthLength = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const first = firstSunday(year, monthIndex)
  const finalSaturday = lastSaturday(year, monthIndex)
  for (let day = 1; day <= monthLength; day += 1) {
    const date = keyForDate(year, monthIndex, day)
    const weekday = getWeekday(date)
    if (weekday === 0) {
      events.push({
        id: `sunday-${date}`,
        date,
        type: 'sunday',
        start: config.scheduleTimes.sunday.start,
        end: config.scheduleTimes.sunday.end,
      })
      if (date === first) {
        events.push({
          id: `communion-${date}`,
          date,
          type: 'communion',
          start: config.scheduleTimes.communion.start,
          end: config.scheduleTimes.communion.end,
        })
      }
    }
    if (weekday === 6) {
      events.push({
        id: `youth-${date}`,
        date,
        type: 'youth',
        start: config.scheduleTimes.youth.start,
        end: config.scheduleTimes.youth.end,
      })
      if (date === finalSaturday) {
        events.push({
          id: `fasting-${date}`,
          date,
          type: 'fasting',
          start: config.scheduleTimes.fasting.start,
          end: config.scheduleTimes.fasting.end,
        })
      }
    }
  }
  return events
}

export function eventName(event, language, translations) {
  if (event.type === 'festival') return translations.theme[event.festivalId]
  if (event.type !== 'custom') return translations.events[event.type]
  return language === 'ta' ? event.titleTa || event.titleEn : event.titleEn || event.titleTa
}

export function festivalEventsBetween(startKey, endKey, config) {
  const start = dateFromKey(startKey)
  const end = dateFromKey(endKey)
  const events = []
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) {
    for (const festival of festivalDates(year)) {
      const setting = config.festivals[festival.id] ?? {}
      if (setting.enabled === false) continue
      const date = setting.date?.slice(0, 4) === festival.date.slice(0, 4) ? setting.date : festival.date
      if (date < startKey || date > endKey) continue
      events.push({
        id: `festival-${festival.id}-${date}`,
        type: 'festival',
        festivalId: festival.id,
        category: festival.id,
        date,
        allDay: true,
      })
    }
  }
  return events
}

export function allEventsBetween(startKey, endKey, config, includeDrafts = false) {
  const start = dateFromKey(startKey)
  const end = dateFromKey(endKey)
  const events = []
  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  while (cursor <= end) {
    events.push(...scheduleEvents(cursor.getUTCFullYear(), cursor.getUTCMonth(), config))
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  }
  for (const event of config.events.filter((item) => item.enabled !== false
    && (includeDrafts || item.status !== 'draft'))) {
    const base = dateFromKey(event.date)
    if (event.recurrence === 'weekly') {
      const distance = Math.max(0, Math.ceil((start - base) / DAY_MS))
      const firstOffset = distance + ((7 - (distance % 7)) % 7)
      for (let offset = firstOffset; ; offset += 7) {
        const occurrence = addDays(event.date, offset)
        if (occurrence > endKey) break
        events.push({ ...event, id: `${event.id}-${occurrence}`, date: occurrence })
      }
    } else if (event.recurrence === 'monthly') {
      for (let monthIndex = start.getUTCFullYear() * 12 + start.getUTCMonth(); monthIndex <= end.getUTCFullYear() * 12 + end.getUTCMonth(); monthIndex += 1) {
        const year = Math.floor(monthIndex / 12)
        const month = monthIndex % 12
        const monthLength = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
        const occurrence = keyForDate(year, month, Math.min(base.getUTCDate(), monthLength))
        if (occurrence >= event.date) events.push({ ...event, id: `${event.id}-${occurrence}`, date: occurrence })
      }
    } else if (event.recurrence === 'yearly') {
      for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) {
        const occurrence = keyForDate(year, base.getUTCMonth(), base.getUTCDate())
        const actual = dateFromKey(occurrence)
        if (actual.getUTCMonth() !== base.getUTCMonth() || actual.getUTCDate() !== base.getUTCDate()) continue
        if (occurrence >= event.date) events.push({ ...event, id: `${event.id}-${occurrence}`, date: occurrence })
      }
    } else {
      events.push(event)
    }
  }
  events.push(...festivalEventsBetween(startKey, endKey, config))
  return events.filter((event) => event.date >= startKey && event.date <= endKey)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.start ?? '').localeCompare(b.start ?? ''))
}

export function getFastingReminder(today) {
  const [year, month] = today.split('-').map(Number)
  const currentMonthDate = lastSaturday(year, month - 1)
  const nextDate = today <= currentMonthDate
    ? currentMonthDate
    : lastSaturday(month === 12 ? year + 1 : year, month === 12 ? 0 : month)
  const daysUntil = Math.round((dateFromKey(nextDate) - dateFromKey(today)) / DAY_MS)
  return {
    date: nextDate,
    isToday: daysUntil === 0,
    isTomorrow: daysUntil === 1,
  }
}

export function activeSpecialEvent(config, today) {
  if (config.themeMode === 'manual') {
    const expiry = config.overrideExpiresAt
    if (!expiry || expiry >= today) return null
  }
  return config.events.find((event) => {
    if (event.enabled === false || !event.autoTheme || !event.theme) return false
    if (event.status === 'draft') return false
    const [year] = today.split('-').map(Number)
    const base = dateFromKey(event.date)
    let eventDate = event.date
    if (event.recurrence === 'yearly') eventDate = keyForDate(year, base.getUTCMonth(), base.getUTCDate())
    if (event.recurrence === 'weekly' || event.recurrence === 'monthly') eventDate = today
    const actual = dateFromKey(eventDate)
    if ((event.recurrence === 'yearly' && (actual.getUTCMonth() !== base.getUTCMonth() || actual.getUTCDate() !== base.getUTCDate()))
      || (event.recurrence === 'weekly' && (today < event.date || (dateFromKey(today) - base) % (7 * DAY_MS) !== 0))
      || (event.recurrence === 'monthly' && (
        today < event.date
        || actual.getUTCDate() !== Math.min(base.getUTCDate(), new Date(Date.UTC(year, actual.getUTCMonth() + 1, 0)).getUTCDate())
      ))
      || (!event.recurrence || event.recurrence === 'none') && today !== event.date) return false
    const start = event.themeStartDate || eventDate
    const end = event.themeEndDate || eventDate
    return today >= start && today <= end
  })
}

export function activeTheme(config, today) {
  if (config.themeMode === 'manual') {
    const expiry = config.overrideExpiresAt
    if (!expiry || expiry >= today) return config.manualTheme || 'normal'
  }
  return activeSpecialEvent(config, today)?.theme ?? getFestivalTheme(today, config.festivals)
}
