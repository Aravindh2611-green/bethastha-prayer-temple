import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDown,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cross,
  MapPin,
  Menu,
  Phone,
  Sparkles,
  X,
} from 'lucide-react'
import { copy as translations, galleryImages, permanentChurchVerse, themePresets } from '../data/content'
import {
  addDays,
  allEventsBetween,
  dateFromKey,
  eventName,
  formatDate,
  formatMonth,
  formatTimeRange,
  getFastingReminder,
  getIstDateKey,
  getWeekday,
  keyForDate,
} from '../lib/church'

const reveal = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.62, ease: [0.22, 1, 0.36, 1] } },
}

const churchOccasionCategories = new Set([
  'christmas', 'newYear', 'goodFriday', 'easter', 'palmSunday', 'maundyThursday',
  'pentecost', 'thanksgiving', 'harvest', 'anniversary', 'baptism', 'revival',
  'fasting', 'worship', 'youth', 'women', 'children', 'family',
])

function viewInCalendar(date, eventId = '') {
  window.dispatchEvent(new CustomEvent('bethastha:calendar-navigate', { detail: { date, eventId } }))
}

function SectionHeading({ eyebrow, title, description, centered = false }) {
  return (
    <motion.div
      className={`section-heading${centered ? ' section-heading--center' : ''}`}
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
    >
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </motion.div>
  )
}

export function SiteHeader({ language, setLanguage }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const t = translations[language]
  const links = [
    ['#home', t.nav.home],
    ['#about', t.nav.about],
    ['#worship', t.nav.worship],
    ['#calendar', t.nav.calendar],
    ['#gallery', t.nav.gallery],
    ['#contact', t.nav.contact],
  ]

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  return (
    <header className="site-header">
      <a className="brand" href="#home" aria-label="Bethastha Prayer Temple home">
        <span className="brand-mark" aria-hidden="true"><Cross size={19} strokeWidth={1.6} /></span>
        <span className="brand-wordmark">
          <strong>பெதஸ்தா ஜெப ஆலயம்</strong>
          <small>BETHASTHA PRAYER TEMPLE</small>
        </span>
      </a>
      <button
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={21} /> : <Menu size={21} />}
      </button>
      <nav className={`main-nav${menuOpen ? ' main-nav--open' : ''}`} aria-label="Main navigation">
        {links.map(([href, label]) => (
          <a href={href} key={href} onClick={() => setMenuOpen(false)}>{label}</a>
        ))}
        <a className="nav-visit" href="#contact" onClick={() => setMenuOpen(false)}>
          {t.nav.visit}<ArrowUpRight size={14} aria-hidden="true" />
        </a>
        <div className="language-switch" role="group" aria-label="Choose language">
          <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
          <span aria-hidden="true">/</span>
          <button type="button" className={language === 'ta' ? 'is-active' : ''} onClick={() => setLanguage('ta')}>தமிழ்</button>
        </div>
      </nav>
    </header>
  )
}

export function HeroSection({ language, theme, config, activeEvent, announcement }) {
  const t = translations[language]
  const themeText = t.theme
  const override = config.themeOverrides?.[theme] ?? {}
  const preset = { ...themePresets[theme], ...override }
  const title = (language === 'ta' ? activeEvent?.titleTa : activeEvent?.titleEn)
    || override[`title${language.toUpperCase()}`]
    || (theme === 'normal' ? t.hero.title : themeText[`${theme}Title`] || themeText[theme])
  const subtitle = (language === 'ta' ? activeEvent?.descriptionTa : activeEvent?.descriptionEn)
    || override[`subtitle${language.toUpperCase()}`]
    || (theme === 'normal' ? t.hero.subtitle : themeText[`${theme}Sub`] || t.hero.subtitle)
  const activeAnnouncement = announcement || (theme !== 'normal' && language === 'en' ? 'A season of worship, prayer, and fellowship.' : '')

  return (
    <section
      className={`hero hero--${theme}`}
      id="home"
      style={{ '--hero-image': `url("${activeEvent?.backgroundImage || preset.image}")`, '--theme-accent': activeEvent?.accent || preset.accent }}
    >
      <div className="hero-grain" aria-hidden="true" />
      <motion.div className="hero-content" initial="hidden" animate="visible" variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.13, delayChildren: 0.16 } },
      }}>
        <motion.span className="hero-kicker" variants={reveal}>
          <span className="kicker-line" />
          {theme === 'normal' ? t.hero.eyebrow : themeText[theme]}
          <span className="kicker-line" />
        </motion.span>
        <motion.h1 variants={reveal}>{title}</motion.h1>
        <motion.p className="hero-subtitle" variants={reveal}>{subtitle}</motion.p>
        <motion.p className="hero-church-name" variants={reveal}>
          {language === 'ta' ? 'பெதஸ்தா ஜெப ஆலயம்' : 'Bethastha Prayer Temple'}
          <span>{language === 'ta' ? 'மதுக்கூர் · தமிழ்நாடு' : 'Madhukkur · Tamil Nadu'}</span>
        </motion.p>
        {activeAnnouncement && (
          <motion.p className="hero-announcement" variants={reveal}>
            <Sparkles size={15} aria-hidden="true" />{activeAnnouncement}
          </motion.p>
        )}
        <motion.div className="hero-actions" variants={reveal}>
          <a className="button button--gold" href="#about">{t.hero.discover}<ArrowDownRight size={16} /></a>
          <a className="button button--outline" href="#contact">{t.hero.contact}</a>
        </motion.div>
      </motion.div>
      <a className="scroll-cue" href="#about" aria-label={t.hero.scroll}>
        <span>{t.hero.scroll}</span><ArrowDown size={16} aria-hidden="true" />
      </a>
      <span className="hero-index" aria-hidden="true">01 / 06</span>
    </section>
  )
}

export function AboutSection({ language, config, theme, activeEvent }) {
  const t = translations[language]
  const override = config.themeOverrides?.[theme] ?? {}
  const verse = activeEvent
    ? {
        en: activeEvent.verseEn || themePresets[theme].verseEn,
        ta: activeEvent.verseTa || themePresets[theme].verseTa,
        referenceEn: activeEvent.verseReferenceEn || themePresets[theme].referenceEn,
        referenceTa: activeEvent.verseReferenceTa || themePresets[theme].referenceTa,
      }
    : theme === 'normal'
    ? config.verse
    : {
        en: override.verseEN ?? themePresets[theme].verseEn,
        ta: override.verseTA ?? themePresets[theme].verseTa,
        referenceEn: override.referenceEN ?? themePresets[theme].referenceEn,
        referenceTa: override.referenceTA ?? themePresets[theme].referenceTa,
      }
  return (
    <>
      <section className="about-section section-pad" id="about">
        <div className="about-layout page-shell">
          <motion.div className="about-art" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <img
              src="https://images.unsplash.com/photo-1473177104440-ffee2f376098?auto=format&fit=crop&w=1200&q=85"
              alt={language === 'ta' ? 'அமைதியான ஆலயத்தின் உள் தோற்றம்' : 'A quiet church sanctuary filled with soft natural light'}
              loading="lazy"
            />
            <div className="about-art-note">
              <span className="note-cross"><Cross size={18} /></span>
              <span>{language === 'ta' ? 'விசுவாசத்தில் ஒன்றாய்' : 'United in faith'}</span>
            </div>
            <span className="about-art-caption">01 — OUR HOME</span>
          </motion.div>
          <motion.div className="about-copy" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <SectionHeading eyebrow={t.about.eyebrow} title={t.about.title} />
            <p className="about-body">{t.about.body}</p>
            <div className="about-signoff"><span className="gold-rule" />{t.about.welcome}</div>
            <a className="text-link" href="#worship">{t.nav.worship}<ArrowRight size={15} /></a>
          </motion.div>
        </div>
      </section>
      <section className="scripture-band">
        <div className="scripture-light" aria-hidden="true" />
        <div className="scripture-content page-shell">
          <span className="eyebrow">{language === 'ta' ? 'இன்றைய திருவசனம்' : 'A WORD FOR THE JOURNEY'}</span>
          <blockquote>“{verse[language]}”</blockquote>
          <span className="scripture-reference">{language === 'ta' ? verse.referenceTa : verse.referenceEn}</span>
          <span className="scripture-mark" aria-hidden="true">“</span>
        </div>
      </section>
    </>
  )
}

export function PermanentVerseSection({ language }) {
  const verse = permanentChurchVerse
  return (
    <section className="permanent-verse-section" aria-labelledby="permanent-verse">
      <motion.div
        className="permanent-verse-card page-shell"
        variants={reveal}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
      >
        <span className="permanent-verse-mark" aria-hidden="true">“</span>
        <span className="eyebrow">{language === 'ta' ? 'எங்கள் ஆலயத்தின் நிலையான வசனம்' : 'OUR CHURCH VERSE'}</span>
        <h2 id="permanent-verse">{language === 'ta' ? verse.ta : verse.en}</h2>
        <span className="permanent-verse-reference">
          {verse.referenceEn} / {verse.referenceTa}
        </span>
      </motion.div>
    </section>
  )
}

function getNextEvent(type, today, config) {
  return allEventsBetween(today, addDays(today, 370), config).find((event) => event.type === type)
}

function ScheduleCard({ icon: Icon, title, when, time, next, special, footer, description, highlighted = false }) {
  return (
    <motion.article className={`schedule-card${highlighted ? ' schedule-card--highlight' : ''}`} variants={reveal}>
      <div className="schedule-card-top">
        <span className="schedule-icon"><Icon size={18} strokeWidth={1.6} /></span>
        {special && <span className="schedule-badge">{special}</span>}
      </div>
      <h3>{title}</h3>
      <p className="schedule-when">{when}</p>
      <p className="schedule-time"><Clock3 size={15} />{time}</p>
      <p className="schedule-description">{description}</p>
      {footer && <p className="schedule-footnote">{footer}</p>}
      {next && <div className="next-date"><span>{next.label}</span><strong>{next.date}</strong></div>}
    </motion.article>
  )
}

export function WorshipSection({ language, config }) {
  const t = translations[language]
  const today = getIstDateKey()
  const nextSunday = getNextEvent('sunday', today, config)
  const nextFasting = getFastingReminder(today)
  const nextYouth = getNextEvent('youth', today, config)
  const nextCommunion = getNextEvent('communion', today, config)
  const nextLabel = (event) => event
    ? { label: t.worship.next, date: formatDate(event.date, language, { weekday: 'short' }) }
    : null
  const cards = [
    { type: 'sunday', Icon: Cross, next: nextLabel(nextSunday), description: language === 'ta' ? 'ஒன்றாய் கூடி தேவனை ஆராதிப்போம்.' : 'Gather together to worship and hear God’s Word.' },
    { type: 'communion', Icon: Sparkles, next: nextLabel(nextCommunion), special: t.worship.special, description: language === 'ta' ? 'மாதத்தின் முதல் ஞாயிறு ஆராதனையின்போது.' : 'Observed during first-Sunday worship.' },
    { type: 'fasting', Icon: Clock3, next: { label: t.worship.next, date: formatDate(nextFasting.date, language, { weekday: 'short' }) }, special: t.worship.special, highlighted: true, description: language === 'ta' ? 'ஜெபத்திலும் உபவாசத்திலும் ஒன்றிணைவோம்.' : 'Come together in prayer and fasting.' },
    {
      type: 'youth',
      Icon: CalendarDays,
      next: nextLabel(nextYouth),
      footer: config.youthPrayerUrl
        ? <a href={config.youthPrayerUrl} target="_blank" rel="noreferrer">{t.worship.join}<ArrowUpRight size={13} /></a>
        : t.worship.contactLink,
      description: language === 'ta' ? 'இளைஞர்களுக்கான வாராந்திர ஆன்லைன் ஜெபம்.' : 'A weekly online prayer gathering for youth.',
    },
  ]
  return (
    <section className="worship-section section-pad" id="worship">
      <div className="page-shell">
        <div className="section-heading-row">
          <SectionHeading eyebrow={t.worship.eyebrow} title={t.worship.title} description={t.worship.intro} />
          <span className="section-side-note"><span className="gold-rule" />{language === 'ta' ? 'அனைவரும் வரவேற்கப்படுகிறீர்கள்' : 'All are welcome'}</span>
        </div>
        <motion.div className="schedule-grid" variants={{ visible: { transition: { staggerChildren: 0.08 } } }} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.12 }}>
          {cards.map(({ type, Icon, next, special, footer, highlighted, description }) => {
            const info = t.worship[type]
            const times = config.scheduleTimes[type]
            const time = formatTimeRange(times.start, times.end, language)
            return (
              <ScheduleCard
                key={type}
                icon={Icon}
                title={info}
                when={t.worship[`${type}When`]}
                time={type === 'communion' ? t.worship.communionTime : time}
                description={description}
                next={next}
                special={special}
                footer={footer}
                highlighted={highlighted}
              />
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}

function CalendarGrid({ year, monthIndex, today, selected, events, language, onSelect, onPrevious, onNext, onToday }) {
  const t = translations[language].calendar
  const startWeekday = (getWeekday(keyForDate(year, monthIndex, 1)) + 6) % 7
  const monthLength = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const cellCount = Math.ceil((startWeekday + monthLength) / 7) * 7
  const startDate = keyForDate(year, monthIndex, 1 - startWeekday)
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const date = addDays(startDate, index)
    return { date, day: dateFromKey(date).getUTCDate(), inMonth: date.slice(0, 7) === `${year}-${String(monthIndex + 1).padStart(2, '0')}` }
  })
  const eventDates = new Map()
  events.forEach((event) => {
    eventDates.set(event.date, [...(eventDates.get(event.date) ?? []), event])
  })

  return (
    <div className="calendar-panel">
      <div className="calendar-topbar">
        <div>
          <span className="calendar-kicker">{t.month}</span>
          <h3>{formatMonth(year, monthIndex, language)}</h3>
        </div>
        <div className="calendar-controls">
          <button type="button" onClick={onToday} className="calendar-today">{t.today}</button>
          <button type="button" onClick={onPrevious} aria-label={t.prev}><ChevronLeft size={18} /></button>
          <button type="button" onClick={onNext} aria-label={t.next}><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="calendar-grid" role="grid" aria-label={formatMonth(year, monthIndex, language)}>
        {t.weekDays.map((day, index) => <span className="calendar-weekday" role="columnheader" key={`${day}-${index}`}>{day}</span>)}
        {cells.map(({ date, day, inMonth }) => {
          const markers = eventDates.get(date) ?? []
          return (
            <button
              className={`calendar-day${inMonth ? '' : ' is-outside'}${date === today ? ' is-today' : ''}${date === selected ? ' is-selected' : ''}`}
              type="button"
              role="gridcell"
              key={date}
              aria-label={`${formatDate(date, language)}${markers.length ? `, ${markers.length} ${language === 'ta' ? 'நிகழ்வுகள்' : 'events'}` : ''}`}
              aria-pressed={date === selected}
              onClick={() => onSelect(date)}
            >
              <span>{new Intl.NumberFormat(language === 'ta' ? 'ta-IN' : 'en-IN').format(day)}</span>
              {markers.length > 0 && (
                <span className="calendar-dots" aria-hidden="true">
                  {markers.slice(0, 5).map((event) => <i className={`event-dot event-dot--${event.type}`} key={event.id} />)}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="calendar-legend">
        <span><i className="event-dot event-dot--sunday" />{translations[language].events.sunday}</span>
        <span><i className="event-dot event-dot--fasting" />{translations[language].events.fasting}</span>
        <span><i className="event-dot event-dot--festival" />{language === 'ta' ? 'கிறிஸ்தவ பண்டிகை' : 'Christian occasion'}</span>
        <span><i className="event-dot event-dot--custom" />{language === 'ta' ? 'சிறப்பு நிகழ்வு' : 'Special event'}</span>
      </div>
    </div>
  )
}

function eventDescription(event, language) {
  if (event.type === 'festival') return translations[language].theme[`${event.festivalId}Sub`] || ''
  return language === 'ta' ? event.descriptionTa : event.descriptionEn
}

function eventCategory(event, language) {
  const t = translations[language]
  if (event.type === 'festival') return t.theme[event.festivalId]
  return t.admin.eventCategories[event.category] || t.events[event.type] || t.events.special
}

function EventListItem({ event, language, compact = false, onViewCalendar, selected = false }) {
  const start = event.allDay ? null : formatTimeRange(event.start, event.end, language)
  const title = eventName(event, language, translations[language])
  const description = eventDescription(event, language)
  return (
    <article className={`event-list-item${compact ? ' event-list-item--compact' : ''}${selected ? ' is-selected' : ''}`}>
      <div className="event-date-tile">
        <span>{new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', { month: 'short', timeZone: 'UTC' }).format(dateFromKey(event.date))}</span>
        <strong>{new Intl.NumberFormat(language === 'ta' ? 'ta-IN' : 'en-IN').format(dateFromKey(event.date).getUTCDate())}</strong>
      </div>
      <div className="event-details">
        <h4>{title}</h4>
        <p className="event-category">{eventCategory(event, language)}</p>
        {start ? <p><Clock3 size={13} />{start}</p> : event.allDay && <p>{language === 'ta' ? 'முழுநாள் நிகழ்வு' : 'All day'}</p>}
        {event.location && <p><MapPin size={13} />{event.location}</p>}
        {description && <p className="event-description">{description}</p>}
        {onViewCalendar && (
          <button className="event-calendar-link" type="button" onClick={onViewCalendar}>
            {translations[language].events.viewCalendar}<ArrowUpRight size={13} />
          </button>
        )}
      </div>
      <span className={`event-type-mark event-type-mark--${event.category || event.type}`} aria-hidden="true" />
    </article>
  )
}

export function CalendarSection({ language, config, now }) {
  const t = translations[language]
  const [clockNow, setClockNow] = useState(now)
  const today = getIstDateKey(clockNow)
  useEffect(() => {
    const interval = window.setInterval(() => setClockNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])
  const [view, setView] = useState(() => {
    const date = dateFromKey(today)
    return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() }
  })
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedEventId, setSelectedEventId] = useState('')
  const goMonth = (amount) => {
    const date = new Date(Date.UTC(view.year, view.monthIndex + amount, 1))
    setView({ year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() })
  }
  const monthEvents = useMemo(() => {
    const lastDay = new Date(Date.UTC(view.year, view.monthIndex + 1, 0)).getUTCDate()
    const first = keyForDate(view.year, view.monthIndex, 1 - ((getWeekday(keyForDate(view.year, view.monthIndex, 1)) + 6) % 7))
    const last = keyForDate(view.year, view.monthIndex, lastDay + 7)
    return allEventsBetween(first, last, config)
  }, [view, config])
  const selectedEvents = monthEvents.filter((event) => event.date === selectedDate)
  const nextEvents = useMemo(() => {
    const allEvents = allEventsBetween(today, addDays(today, 400), config)
    const occasions = allEvents.filter((event) => event.type === 'festival' || churchOccasionCategories.has(event.category))
    const routine = allEvents.filter((event) => event.type !== 'festival' && !churchOccasionCategories.has(event.category))
    return [...routine.slice(0, 3), ...occasions.slice(0, 5)]
      .sort((first, second) => first.date.localeCompare(second.date) || first.start?.localeCompare(second.start || '') || 0)
  }, [today, config])
  const selectedDateLabel = formatDate(selectedDate, language)
  const fasting = getFastingReminder(today)
  useEffect(() => {
    const handleCalendarNavigation = (event) => {
      const { date, eventId = '' } = event.detail || {}
      if (!date) return
      const target = dateFromKey(date)
      setView({ year: target.getUTCFullYear(), monthIndex: target.getUTCMonth() })
      setSelectedDate(date)
      setSelectedEventId(eventId)
      window.setTimeout(() => document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0)
    }
    window.addEventListener('bethastha:calendar-navigate', handleCalendarNavigation)
    return () => window.removeEventListener('bethastha:calendar-navigate', handleCalendarNavigation)
  }, [])
  const clock = new Intl.DateTimeFormat(language === 'ta' ? 'ta-IN' : 'en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: language !== 'ta', timeZone: 'Asia/Kolkata',
  }).format(clockNow)

  return (
    <section className="calendar-section section-pad" id="calendar">
      <div className="page-shell">
        <div className="calendar-intro">
          <SectionHeading eyebrow={t.calendar.eyebrow} title={t.calendar.title} description={t.calendar.intro} />
          <div className="live-time">
            <span className="live-dot" />
            <div><strong>{clock} <small>IST</small></strong><span>{formatDate(today, language)}</span></div>
          </div>
        </div>
        <div className="calendar-layout">
          <CalendarGrid
            year={view.year}
            monthIndex={view.monthIndex}
            today={today}
            selected={selectedDate}
            events={monthEvents}
            language={language}
            onSelect={(date) => {
              setSelectedDate(date)
              setSelectedEventId('')
            }}
            onPrevious={() => goMonth(-1)}
            onNext={() => goMonth(1)}
            onToday={() => {
              const date = dateFromKey(today)
              setView({ year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() })
              setSelectedDate(today)
              setSelectedEventId('')
            }}
          />
          <aside className="calendar-sidebar">
            <div className="selected-day-card">
              <span className="eyebrow">{selectedDate === today ? t.calendar.todayLabel : t.calendar.today}</span>
              <h3>{selectedDateLabel}</h3>
              <div className="selected-event-list">
                {selectedEvents.length
                  ? selectedEvents.map((event) => (
                    <EventListItem
                      event={event}
                      language={language}
                      key={event.id}
                      compact
                      selected={event.id === selectedEventId}
                      onViewCalendar={() => setSelectedEventId(event.id)}
                    />
                  ))
                  : <p className="no-events">{t.calendar.noEvents}</p>}
              </div>
            </div>
            <div className="upcoming-card">
              <div className="upcoming-card-heading"><span className="eyebrow">{t.calendar.upcoming}</span><ArrowRight size={16} /></div>
              {nextEvents.length
                ? nextEvents.map((event) => (
                  <EventListItem
                    event={event}
                    language={language}
                    key={event.id}
                    compact
                    onViewCalendar={() => viewInCalendar(event.date, event.id)}
                  />
                ))
                : <p className="no-events">{t.events.empty}</p>}
            </div>
          </aside>
        </div>
        {selectedEventId && selectedEvents.some((event) => event.id === selectedEventId) && (
          <div className="calendar-selection-note" role="status">
            <CalendarDays size={16} />{language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்ட நிகழ்வு' : 'Selected event'}: {eventName(selectedEvents.find((event) => event.id === selectedEventId), language, t)}
          </div>
        )}
        <div className={`fasting-reminder${fasting.isToday ? ' fasting-reminder--today' : ''}${fasting.isTomorrow ? ' fasting-reminder--tomorrow' : ''}`}>
          <div className="reminder-symbol"><Clock3 size={21} /></div>
          <div className="reminder-copy">
            <span>{fasting.isToday ? t.calendar.fastingToday : fasting.isTomorrow ? t.calendar.fastingTomorrow : t.calendar.fastingNext}</span>
            <strong>{formatDate(fasting.date, language)} <i>·</i> {formatTimeRange(config.scheduleTimes.fasting.start, config.scheduleTimes.fasting.end, language)}</strong>
          </div>
          <span className="reminder-time">{t.calendar.ist}</span>
        </div>
      </div>
    </section>
  )
}

export function EventsSection({ language, config, theme, activeEvent }) {
  const t = translations[language]
  const today = getIstDateKey()
  const events = allEventsBetween(today, addDays(today, 180), config).slice(0, 6)
  const announcement = config.announcement[language] || (language === 'ta' ? activeEvent?.announcementTa : activeEvent?.announcementEn)
  const fasting = getFastingReminder(today)
  return (
    <section className="events-section section-pad" id="events">
      <div className="page-shell">
        <div className="events-heading">
          <SectionHeading eyebrow={t.events.eyebrow} title={t.events.title} description={t.events.intro} />
          <div className="events-heading-stamp"><span>{today.slice(0, 4)}</span><small>{language === 'ta' ? 'விசுவாசம் · ஜெபம் · ஐக்கியம்' : 'FAITH · PRAYER · FELLOWSHIP'}</small></div>
        </div>
        {announcement && (
          <motion.div className="announcement-banner" variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <span className="announcement-icon"><Sparkles size={17} /></span>
            <p>{announcement}</p>
            <span className="announcement-theme">{translations[language].theme[theme]}</span>
          </motion.div>
        )}
        <div className={`event-fasting-callout${fasting.isToday ? ' event-fasting-callout--today' : ''}`}>
          <span className="fasting-callout-mark"><Clock3 size={17} /></span>
          <div>
            <strong>{fasting.isToday ? t.calendar.fastingToday : fasting.isTomorrow ? t.calendar.fastingTomorrow : t.reminder.next}</strong>
            <span>{formatDate(fasting.date, language)} · {formatTimeRange(config.scheduleTimes.fasting.start, config.scheduleTimes.fasting.end, language)}</span>
          </div>
          <a href="#calendar">{t.nav.calendar}<ArrowUpRight size={14} /></a>
        </div>
        {events.length ? (
          <div className="featured-events">
            {events.map((event, index) => (
              <motion.div className="featured-event" key={event.id} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }}>
                <span className="featured-event-number">0{index + 1}</span>
                <EventListItem
                  event={event}
                  language={language}
                  onViewCalendar={() => viewInCalendar(event.date, event.id)}
                />
                <span className="featured-event-day">{formatDate(event.date, language, { weekday: 'long', month: 'short', year: undefined })}</span>
              </motion.div>
            ))}
          </div>
        ) : <p className="no-events">{t.events.empty}</p>}
      </div>
    </section>
  )
}

export function FestivalSection({ language, config, today }) {
  const t = translations[language]
  const festivals = useMemo(() => {
    return allEventsBetween(today, addDays(today, 400), config)
      .filter((event) => event.type === 'festival' || churchOccasionCategories.has(event.category))
      .slice(0, 10)
  }, [config, today])
  if (!festivals.length) return null

  return (
    <section className="festival-section">
      <div className="page-shell festival-layout">
        <div className="festival-heading">
          <span className="eyebrow">{language === 'ta' ? 'கிறிஸ்தவ பண்டிகைகள்' : 'THE CHURCH YEAR'}</span>
          <h2>{language === 'ta' ? 'நம்பிக்கையின் பருவங்கள்' : 'Seasons of faith'}</h2>
        </div>
        <div className="festival-list">
          {festivals.map((event) => (
            <motion.article className="festival-item" key={event.id} variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }}>
              <span className="festival-date">{formatDate(event.date, language, { weekday: 'short', year: undefined })}</span>
              <div className="festival-item-copy">
                <span className="festival-name">{eventName(event, language, t)}</span>
                <span className="festival-item-description">{eventDescription(event, language)}</span>
              </div>
              <button className="festival-calendar-action" type="button" onClick={() => viewInCalendar(event.date, event.id)}>
                {t.events.viewCalendar}<ArrowUpRight size={15} />
              </button>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FeaturedEventSection({ language, config }) {
  const t = translations[language]
  const today = getIstDateKey()
  const event = allEventsBetween(today, addDays(today, 370), config)
    .find((item) => item.type === 'custom' && item.featured)
  if (!event) return null
  const title = eventName(event, language, t)
  const description = eventDescription(event, language)
  return (
    <section className="featured-event-section" aria-label={t.events.eyebrow}>
      <div className="page-shell featured-event-shell">
        <span className="featured-event-kicker"><Sparkles size={14} />{language === 'ta' ? 'சிறப்பு நிகழ்வு' : 'FEATURED GATHERING'}</span>
        <div className="featured-event-copy">
          <div className="featured-event-date">{formatDate(event.date, language, { weekday: 'short' })}</div>
          <div><h2>{title}</h2><p>{description}</p></div>
        </div>
        <div className="featured-event-meta">
          <span><Sparkles size={15} />{eventCategory(event, language)}</span>
          {!event.allDay && <span><Clock3 size={15} />{formatTimeRange(event.start, event.end, language)}</span>}
          {event.allDay && <span>{language === 'ta' ? 'முழுநாள் நிகழ்வு' : 'All day'}</span>}
          {event.location && <span><MapPin size={15} />{event.location}</span>}
          <button type="button" onClick={() => viewInCalendar(event.date, event.id)}>{t.events.viewCalendar}<ArrowRight size={15} /></button>
        </div>
      </div>
    </section>
  )
}

export function GallerySection({ language, config, theme, activeEvent }) {
  const t = translations[language]
  const themedImage = activeEvent?.backgroundImage
    || config.themeOverrides?.[theme]?.galleryImage
    || themePresets[theme].galleryImage
  const festivalImage = theme === 'normal' || !themedImage
    ? []
    : [{ id: `festival-${theme}`, src: themedImage, altEn: translations.en.theme[theme], altTa: translations.ta.theme[theme], shape: 'landscape' }]
  const visibleImages = galleryImages.filter((image) => !config.hiddenGalleryImages.includes(image.id))
  const images = [...festivalImage, ...visibleImages, ...config.gallery]
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    if (!selected) return undefined
    const close = (event) => {
      if (event.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [selected])
  return (
    <section className="gallery-section section-pad" id="gallery">
      <div className="page-shell">
        <div className="gallery-heading">
          <SectionHeading eyebrow={t.gallery.eyebrow} title={t.gallery.title} description={t.gallery.intro} />
          <span className="gallery-count">0{images.length}<small> / {language === 'ta' ? 'தருணங்கள்' : 'MOMENTS'}</small></span>
        </div>
        <div className="gallery-grid">
          {images.map((image, index) => (
            <motion.button
              className={`gallery-image gallery-image--${image.shape || (index % 2 ? 'landscape' : 'portrait')}`}
              type="button"
              key={`${image.src}-${index}`}
              onClick={() => setSelected(index)}
              aria-label={`${t.gallery.open}: ${language === 'ta' ? image.altTa || image.captionTa || image.captionEn : image.altEn || image.captionEn || image.captionTa}`}
              variants={reveal}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.12 }}
              whileHover={{ y: -4 }}
            >
              <img src={image.src} alt={language === 'ta' ? image.altTa || image.captionTa || '' : image.altEn || image.captionEn || ''} loading="lazy" />
              <span className="gallery-image-overlay"><span>0{index + 1}</span><ArrowUpRight size={17} /></span>
            </motion.button>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {selected !== null && (
          <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null)
          }}>
            <button className="lightbox-close" type="button" aria-label={t.gallery.close} onClick={() => setSelected(null)}><X size={22} /></button>
            <button className="lightbox-nav lightbox-nav--prev" type="button" aria-label="Previous image" onClick={() => setSelected((selected + images.length - 1) % images.length)}><ArrowLeft size={20} /></button>
            <motion.img key={images[selected].src} src={images[selected].src} alt={language === 'ta' ? images[selected].altTa || images[selected].captionTa || '' : images[selected].altEn || images[selected].captionEn || ''} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} />
            <button className="lightbox-nav lightbox-nav--next" type="button" aria-label="Next image" onClick={() => setSelected((selected + 1) % images.length)}><ArrowRight size={20} /></button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export function ContactSection({ language, config }) {
  const t = translations[language]
  const churchInfo = config.churchInfo
  const address = language === 'ta' ? churchInfo.addressTa : churchInfo.addressEn
  const landmarks = language === 'ta' ? churchInfo.landmarksTa : churchInfo.landmarksEn
  const rawPhoneDigits = churchInfo.phone.replace(/\D/g, '')
  const phoneDigits = rawPhoneDigits.startsWith('91') && rawPhoneDigits.length > 10 ? rawPhoneDigits.slice(2) : rawPhoneDigits
  const internationalPhone = `91${phoneDigits}`
  const mapUrl = 'https://www.google.com/maps/dir/?api=1&destination=Jamaliya+Super+Market%2C+Madukkur%2C+Tamil+Nadu+614903'
  return (
    <section className="contact-section section-pad" id="contact">
      <div className="page-shell contact-layout">
        <div className="contact-intro">
          <SectionHeading eyebrow={t.contact.eyebrow} title={t.contact.title} description={t.contact.intro} />
          <a className="contact-phone" href={`tel:+${internationalPhone}`}><Phone size={17} />+91 {phoneDigits}</a>
          <div className="landmark-card">
            <span className="eyebrow">{t.contact.nearby}</span>
            <p>{landmarks}</p>
            <a className="button button--gold contact-map" href={mapUrl} target="_blank" rel="noreferrer">
              <MapPin size={16} />{t.contact.directions}<ArrowUpRight size={14} />
            </a>
            <small>{t.contact.mapNote}</small>
          </div>
        </div>
        <div className="contact-details">
          <div className="contact-detail">
            <span className="contact-detail-icon"><MapPin size={18} /></span>
            <div><span className="eyebrow">{t.contact.address}</span><p>{address}</p></div>
          </div>
          <div className="contact-detail">
            <span className="contact-detail-icon"><Phone size={18} /></span>
            <div><span className="eyebrow">{t.contact.call}</span><p><a href={`tel:+${internationalPhone}`}>{phoneDigits}</a></p></div>
          </div>
          <div className="contact-detail">
            <span className="contact-detail-icon"><Cross size={18} /></span>
            <div><span className="eyebrow">{t.contact.registration}</span><p>{churchInfo.registration}</p></div>
          </div>
          <a className="whatsapp-link" href={`https://wa.me/${internationalPhone}`} target="_blank" rel="noreferrer">{t.contact.whatsapp}<ArrowUpRight size={15} /></a>
        </div>
      </div>
    </section>
  )
}

export function SiteFooter({ language }) {
  const t = translations[language]
  return (
    <footer className="site-footer">
      <div className="page-shell">
        <div className="footer-main">
          <a className="brand brand--footer" href="#home">
            <span className="brand-mark" aria-hidden="true"><Cross size={19} strokeWidth={1.6} /></span>
            <span className="brand-wordmark"><strong>பெதஸ்தா ஜெப ஆலயம்</strong><small>BETHASTHA PRAYER TEMPLE</small></span>
          </a>
          <p>{t.footer.tagline}</p>
          <a className="footer-admin-link" href="/admin">{t.footer.admin}<ArrowUpRight size={13} /></a>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Bethastha Prayer Temple. {t.footer.rights}</span>
          <span>{t.footer.glory} <span className="footer-gold">✦</span></span>
        </div>
      </div>
    </footer>
  )
}
