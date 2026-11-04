import { useEffect, useMemo, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { DEFAULT_LANGUAGE, defaultConfig, themePresets } from './data/content'
import {
  AboutSection,
  CalendarSection,
  ContactSection,
  EventsSection,
  FeaturedEventSection,
  FestivalSection,
  GallerySection,
  HeroSection,
  PermanentVerseSection,
  SiteFooter,
  SiteHeader,
  WorshipSection,
} from './components/SiteSections'
import AdminPage from './pages/AdminPage'
import { activeSpecialEvent, activeTheme, getIstDateKey } from './lib/church'
import { fetchPublishedConfig } from './lib/supabase'
import { normalizeConfig } from './lib/supabase'
import './App.css'

function readLanguage() {
  try {
    const saved = window.localStorage.getItem('bethastha-language')
    return saved === 'en' || saved === 'ta' ? saved : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function SiteApp() {
  const [language, setLanguage] = useState(readLanguage)
  const [now, setNow] = useState(() => new Date())
  const [config, setConfig] = useState(() => normalizeConfig(defaultConfig))
  const [configLoadError, setConfigLoadError] = useState(null)
  const [configRetry, setConfigRetry] = useState(0)
  const today = getIstDateKey(now)
  const theme = useMemo(() => activeTheme(config, today), [config, today])
  const activeEvent = useMemo(() => activeSpecialEvent(config, today), [config, today])
  const heroImage = activeEvent?.backgroundImage || config.themeOverrides?.[theme]?.image || themePresets[theme].image
  const missingSettingsTable = configLoadError?.code === 'PGRST205'
  const configErrorMessage = configLoadError
    ? language === 'ta'
      ? missingSettingsTable
        ? 'Supabase-இல் public.site_config அட்டவணை காணப்படவில்லை. supabase/schema.sql-ஐ Supabase SQL Editor-இல் இயக்கி மீண்டும் முயற்சிக்கவும்.'
        : 'பகிரப்பட்ட அமைப்புகளை Supabase-இலிருந்து ஏற்ற முடியவில்லை. இணைய இணைப்பையும் திட்ட அமைப்பையும் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.'
      : missingSettingsTable
        ? 'Supabase cannot find public.site_config (PGRST205). Run supabase/schema.sql in the Supabase SQL Editor, then retry. If you already ran it, wait briefly for the API schema cache to refresh.'
        : 'Shared settings could not be loaded from Supabase. Check the connection and project configuration, then retry.'
    : ''

  useEffect(() => {
    try {
      window.localStorage.setItem('bethastha-language', language)
      document.documentElement.lang = language
    } catch (error) {
      console.warn('Could not save the selected language.', error)
    }
  }, [language])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    let active = true
    fetchPublishedConfig()
      .then((published) => {
        if (active && published) setConfig(published)
        if (active) setConfigLoadError(null)
      })
      .catch((error) => {
        console.error('Could not load the published church website configuration.', error)
        if (active) setConfigLoadError({ code: error.code, message: error.message })
      })
    return () => { active = false }
  }, [configRetry])

  useEffect(() => {
    const image = heroImage
    if (!image) return undefined
    const preload = document.createElement('link')
    preload.rel = 'preload'
    preload.as = 'image'
    preload.href = image
    preload.fetchPriority = 'high'
    preload.dataset.activeHero = 'true'
    document.head.querySelector('[data-active-hero="true"]')?.remove()
    document.head.appendChild(preload)
    return () => preload.remove()
  }, [heroImage])

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="public-site"
        data-theme={theme}
        style={{ '--theme-accent': activeEvent?.accent || config.themeOverrides?.[theme]?.accent || themePresets[theme].accent }}
      >
        <SiteHeader language={language} setLanguage={setLanguage} />
        {configLoadError && (
          <div className="config-notice" role="status">
            {configErrorMessage}
            {configLoadError.code && <small>{configLoadError.code}: {configLoadError.message}</small>}
            <button type="button" onClick={() => setConfigRetry((count) => count + 1)}>{language === 'ta' ? 'மீண்டும் முயற்சி' : 'Retry'}</button>
          </div>
        )}
        <main>
          <HeroSection
            language={language}
            theme={theme}
            config={config}
            activeEvent={activeEvent}
            announcement={config.announcement[language] || (language === 'ta' ? activeEvent?.announcementTa : activeEvent?.announcementEn) || ''}
          />
          <PermanentVerseSection language={language} />
          <AboutSection language={language} config={config} theme={theme} activeEvent={activeEvent} />
          <WorshipSection language={language} config={config} />
          <FeaturedEventSection language={language} config={config} />
          <CalendarSection key={today} language={language} config={config} now={now} />
          <EventsSection language={language} config={config} theme={theme} activeEvent={activeEvent} />
          <FestivalSection language={language} config={config} today={today} />
          <GallerySection language={language} config={config} theme={theme} activeEvent={activeEvent} />
          <ContactSection language={language} config={config} />
        </main>
        <SiteFooter language={language} />
      </div>
    </MotionConfig>
  )
}

export default function App() {
  return window.location.pathname.replace(/\/+$/, '') === '/admin'
    ? <AdminPage />
    : <SiteApp />
}
