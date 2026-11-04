import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock3,
  Eye,
  ImagePlus,
  LogOut,
  Plus,
  Save,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { copy, DEFAULT_LANGUAGE, defaultConfig, galleryImages, themePresets } from '../data/content'
import { addDays, allEventsBetween, eventName, formatDate, getIstDateKey } from '../lib/church'
import { loadAdminConfig, normalizeConfig, publishConfig, saveDraftConfig, supabase } from '../lib/supabase'
import '../App.css'

const tabs = ['theme', 'events', 'content', 'churchInfo', 'gallery']
const themeIds = Object.keys(themePresets)
const festivalIds = ['christmas', 'newYear', 'palmSunday', 'maundyThursday', 'goodFriday', 'easter', 'pentecost']
const eventCategoryIds = Object.keys(copy.en.admin.eventCategories)

function initialLanguage() {
  try {
    const stored = window.localStorage.getItem('bethastha-language')
    return stored === 'en' || stored === 'ta' ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

function formatAdminLoadError(error, t) {
  const code = error?.code
  const prefix = ['PGRST204', 'PGRST205', '42P01', '42703'].includes(code)
    ? t.schemaLoadError
    : code === '42501'
      ? t.permissionLoadError
      : t.genericLoadError
  const detail = [code && `(${code})`, error?.message].filter(Boolean).join(' ')
  return `${prefix} ${detail}`
}

function updateTheme(config, selected, changes) {
  return {
    ...config,
    themeOverrides: {
      ...config.themeOverrides,
      [selected]: { ...config.themeOverrides?.[selected], ...changes },
    },
  }
}

function AdminLogin({ language, onSignedIn }) {
  const t = copy[language].admin
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError
      await onSignedIn()
    } catch (signInError) {
      console.error('Admin sign-in failed.', signInError)
      setError(t.loginError)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-login-card" onSubmit={submit}>
      <span className="admin-login-icon"><ShieldCheck size={24} /></span>
      <span className="eyebrow">{t.eyebrow}</span>
      <h1>{t.title}</h1>
      <p>{t.subtitle}</p>
      {error && <div className="admin-error" role="alert">{error}</div>}
      <label>{t.email}<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>{t.password}<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <button className="button button--gold admin-submit" type="submit" disabled={busy}>
        {busy ? t.signingIn : t.signIn}<ArrowUpRight size={15} />
      </button>
    </form>
  )
}

function ThemePanel({ language, draft, setDraft, previewTheme, setPreviewTheme }) {
  const t = copy[language].admin
  const labels = copy[language].theme
  const override = draft.themeOverrides?.[previewTheme] ?? {}
  const preset = { ...themePresets[previewTheme], ...override }
  const update = (key, value) => setDraft((current) => updateTheme(current, previewTheme, { [key]: value }))
  return (
    <div className="admin-panel-grid">
      <div className="admin-form-section">
        <span className="eyebrow">{t.theme}</span>
        <label className="admin-field">{t.themeChoice}
          <select value={previewTheme} onChange={(event) => setPreviewTheme(event.target.value)}>
            {themeIds.map((id) => <option value={id} key={id}>{labels[id]}</option>)}
          </select>
        </label>
        <div className="theme-mode-options">
          <label className={`mode-option${draft.themeMode === 'auto' ? ' mode-option--active' : ''}`}>
            <input type="radio" name="theme-mode" value="auto" checked={draft.themeMode === 'auto'} onChange={() => setDraft((current) => ({ ...current, themeMode: 'auto' }))} />
            <span><strong>{t.automatic}</strong><small>{language === 'ta' ? 'பண்டிகை நாட்களில் தானாக மாறும்' : 'Activates configured festival themes automatically.'}</small></span>
          </label>
          <label className={`mode-option${draft.themeMode === 'manual' ? ' mode-option--active' : ''}`}>
            <input type="radio" name="theme-mode" value="manual" checked={draft.themeMode === 'manual'} onChange={() => setDraft((current) => ({ ...current, themeMode: 'manual' }))} />
            <span><strong>{t.manual}</strong><small>{language === 'ta' ? 'கைமுறையாகத் தேர்ந்தெடுத்த தோற்றம்' : 'Keep a selected theme active until it expires.'}</small></span>
          </label>
        </div>
        {draft.themeMode === 'manual' && (
          <div className="admin-fields-two">
            <label className="admin-field">{t.themeChoice}
              <select value={draft.manualTheme} onChange={(event) => setDraft((current) => ({ ...current, manualTheme: event.target.value }))}>
                {themeIds.map((id) => <option value={id} key={id}>{labels[id]}</option>)}
              </select>
            </label>
            <label className="admin-field">{t.expires}<input type="date" value={draft.overrideExpiresAt} onChange={(event) => setDraft((current) => ({ ...current, overrideExpiresAt: event.target.value }))} /></label>
          </div>
        )}
        <div className="admin-fields-two">
          <label className="admin-field">{language === 'ta' ? 'தலைப்பு (ஆங்கிலம்)' : 'Hero heading (English)'}
            <input value={override.titleEN ?? preset.heading ?? ''} onChange={(event) => update('titleEN', event.target.value)} placeholder={language === 'ta' ? 'இயல்புநிலைத் தலைப்பு' : 'Default theme heading'} />
          </label>
          <label className="admin-field">{language === 'ta' ? 'தலைப்பு (தமிழ்)' : 'Hero heading (Tamil)'}
            <input value={override.titleTA ?? ''} onChange={(event) => update('titleTA', event.target.value)} placeholder={labels[previewTheme]} />
          </label>
        </div>
        <div className="admin-fields-two">
          <label className="admin-field">{language === 'ta' ? 'துணை உரை (ஆங்கிலம்)' : 'Subtitle (English)'}
            <textarea rows="2" value={override.subtitleEN ?? ''} onChange={(event) => update('subtitleEN', event.target.value)} placeholder={preset.subtitle ?? ''} />
          </label>
          <label className="admin-field">{language === 'ta' ? 'துணை உரை (தமிழ்)' : 'Subtitle (Tamil)'}
            <textarea rows="2" value={override.subtitleTA ?? ''} onChange={(event) => update('subtitleTA', event.target.value)} />
          </label>
        </div>
        <div className="admin-fields-two">
          <label className="admin-field">{t.verseEn}
            <textarea rows="2" value={override.verseEN ?? preset.verseEn} onChange={(event) => update('verseEN', event.target.value)} />
          </label>
          <label className="admin-field">{t.verseTa}
            <textarea rows="2" value={override.verseTA ?? preset.verseTa} onChange={(event) => update('verseTA', event.target.value)} />
          </label>
        </div>
        <div className="admin-fields-two">
          <label className="admin-field">{language === 'ta' ? 'வசன குறிப்பு (ஆங்கிலம்)' : 'Verse reference (English)'}
            <input value={override.referenceEN ?? preset.referenceEn} onChange={(event) => update('referenceEN', event.target.value)} />
          </label>
          <label className="admin-field">{language === 'ta' ? 'வசன குறிப்பு (தமிழ்)' : 'Verse reference (Tamil)'}
            <input value={override.referenceTA ?? preset.referenceTa} onChange={(event) => update('referenceTA', event.target.value)} />
          </label>
        </div>
        <div className="admin-fields-two">
          <label className="admin-field">{language === 'ta' ? 'பின்னணி பட URL' : 'Hero image URL'}
            <input type="url" value={override.image ?? preset.image} onChange={(event) => update('image', event.target.value)} />
          </label>
          <label className="admin-field">{language === 'ta' ? 'தங்க நிறம்' : 'Accent color'}
            <span className="color-control"><input type="color" value={override.accent ?? preset.accent} onChange={(event) => update('accent', event.target.value)} /><input value={override.accent ?? preset.accent} onChange={(event) => update('accent', event.target.value)} /></span>
          </label>
        </div>
        <label className="admin-field theme-gallery-field">{language === 'ta' ? 'பண்டிகை படத்தொகுப்பு படம் (விருப்பத்தேர்வு)' : 'Festival gallery image (optional)'}
          <input type="url" value={override.galleryImage ?? preset.galleryImage ?? ''} onChange={(event) => update('galleryImage', event.target.value)} placeholder="https://" />
        </label>
        <div className="festival-settings">
          <div className="subsection-title"><Settings2 size={16} /><strong>{language === 'ta' ? 'பண்டிகை நாட்கள்' : 'Festival date settings'}</strong></div>
          {festivalIds.map((id) => {
            const setting = draft.festivals[id] ?? {}
            return (
              <div className="festival-setting-row" key={id}>
                <label className="toggle-label">
                  <input type="checkbox" checked={setting.enabled !== false} onChange={(event) => setDraft((current) => ({
                    ...current,
                    festivals: { ...current.festivals, [id]: { ...current.festivals[id], enabled: event.target.checked } },
                  }))} />
                  <span>{labels[id]}</span>
                </label>
                <input aria-label={`${labels[id]} festival date`} type="date" value={setting.date ?? ''} onChange={(event) => setDraft((current) => ({
                  ...current,
                  festivals: { ...current.festivals, [id]: { ...current.festivals[id], date: event.target.value } },
                }))} />
                <input aria-label={`${labels[id]} theme start date`} type="date" value={setting.startDate ?? ''} onChange={(event) => setDraft((current) => ({
                  ...current,
                  festivals: { ...current.festivals, [id]: { ...current.festivals[id], startDate: event.target.value, endDate: current.festivals[id]?.endDate || event.target.value } },
                }))} />
                <input aria-label={`${labels[id]} theme end date`} type="date" value={setting.endDate ?? ''} onChange={(event) => setDraft((current) => ({
                  ...current,
                  festivals: { ...current.festivals, [id]: { ...current.festivals[id], endDate: event.target.value } },
                }))} />
                <button className="quiet-button" type="button" title={language === 'ta' ? 'தானியங்கி தேதிக்குத் திரும்பு' : 'Use automatic festival dates'} onClick={() => setDraft((current) => {
                  const festivals = { ...current.festivals, [id]: { ...current.festivals[id] } }
                  delete festivals[id].date
                  delete festivals[id].startDate
                  delete festivals[id].endDate
                  return { ...current, festivals }
                })}><Clock3 size={14} /></button>
              </div>
            )
          })}
          <p className="admin-help">{language === 'ta' ? 'பண்டிகை தேதியை மாற்றலாம்; தோற்றத் தொடக்க/முடிவு நாட்கள் காலியாக இருந்தால் இயல்புநிலை காலம் பயன்படுத்தப்படும்.' : 'Set a custom festival date separately from its theme activation start and end dates. Empty values use the calculated date and default theme window.'}</p>
        </div>
      </div>
      <div className="admin-preview-column">
        <span className="preview-label"><Eye size={14} />{t.previewLabel}</span>
        <div className="admin-theme-preview" style={{ backgroundImage: `linear-gradient(180deg,rgba(5,22,17,.14),rgba(4,19,15,.9)),url("${preset.image}")`, '--theme-accent': override.accent ?? preset.accent }}>
          <span>{labels[previewTheme]}</span>
          <h3>{override.titleEN || preset.heading || copy.en.hero.title}</h3>
          <p>{override.subtitleEN || preset.subtitle || copy.en.hero.subtitle}</p>
          <small>{language === 'ta' ? 'பெதஸ்தா ஜெப ஆலயம்' : 'BETHASTHA PRAYER TEMPLE'}</small>
        </div>
        <label className="admin-field admin-announcement">{t.announcementEn}
          <textarea rows="3" value={draft.announcement.en} onChange={(event) => setDraft((current) => ({ ...current, announcement: { ...current.announcement, en: event.target.value } }))} placeholder={language === 'ta' ? 'தேவைப்பட்டால் மட்டும் அறிவிப்பைச் சேர்க்கவும்' : 'Add an announcement if needed'} />
        </label>
        <label className="admin-field admin-announcement">{t.announcementTa}
          <textarea rows="3" value={draft.announcement.ta} onChange={(event) => setDraft((current) => ({ ...current, announcement: { ...current.announcement, ta: event.target.value } }))} />
        </label>
      </div>
    </div>
  )
}

function EventsPanel({ language, draft, setDraft }) {
  const t = copy[language].admin
  const labels = copy[language].theme
  const categories = t.eventCategories
  const [form, setForm] = useState({
    id: '', titleEn: '', titleTa: '', descriptionEn: '', descriptionTa: '', date: '', start: '', end: '',
    category: 'other', location: '', featured: false, status: 'draft', backgroundImage: '',
    accent: '#d6b875', verseEn: '', verseTa: '', verseReferenceEn: '', verseReferenceTa: '',
    announcementEn: '', announcementTa: '', recurrence: 'none', theme: 'normal', autoTheme: false, themeStartDate: '', themeEndDate: '',
  })
  const emptyForm = {
    id: '', titleEn: '', titleTa: '', descriptionEn: '', descriptionTa: '', date: '', start: '', end: '',
    category: 'other', location: '', featured: false, status: 'draft', backgroundImage: '',
    accent: '#d6b875', verseEn: '', verseTa: '', verseReferenceEn: '', verseReferenceTa: '',
    announcementEn: '', announcementTa: '', recurrence: 'none', theme: 'normal', autoTheme: false, themeStartDate: '', themeEndDate: '',
  }
  const addEvent = (event) => {
    event.preventDefault()
    const item = { ...form, id: form.id || crypto.randomUUID(), type: 'custom', enabled: true }
    setDraft((current) => ({
      ...current,
      events: [...current.events.filter((saved) => saved.id !== item.id), item].sort((a, b) => a.date.localeCompare(b.date)),
    }))
    setForm(emptyForm)
  }
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const remove = (id) => setDraft((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }))
  const edit = (event) => {
    setForm({ ...emptyForm, ...event })
    document.querySelector('.admin-event-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const toggle = (id, update) => setDraft((current) => ({
    ...current,
    events: current.events.map((event) => event.id === id ? { ...event, ...update } : event),
  }))

  return (
    <div className="admin-single-panel">
      <div className="admin-form-section">
        <span className="eyebrow">{t.events}</span>
        <form className="admin-event-form" onSubmit={addEvent}>
          <div className="admin-fields-two">
            <label className="admin-field">{t.category}
              <select value={form.category} onChange={(event) => updateField('category', event.target.value)}>
                {eventCategoryIds.map((id) => <option value={id} key={id}>{categories[id]}</option>)}
              </select>
            </label>
            <label className="admin-field">{t.eventLocation}<input value={form.location} onChange={(event) => updateField('location', event.target.value)} /></label>
          </div>
          <div className="admin-fields-two">
            <label className="admin-field">{t.eventName}<input value={form.titleEn} onChange={(event) => updateField('titleEn', event.target.value)} required /></label>
            <label className="admin-field">{t.eventNameTa}<input value={form.titleTa} onChange={(event) => updateField('titleTa', event.target.value)} required /></label>
          </div>
          <div className="admin-fields-two">
            <label className="admin-field">{t.eventDescription}<textarea rows="2" value={form.descriptionEn} onChange={(event) => updateField('descriptionEn', event.target.value)} /></label>
            <label className="admin-field">{t.eventDescriptionTa}<textarea rows="2" value={form.descriptionTa} onChange={(event) => updateField('descriptionTa', event.target.value)} /></label>
          </div>
          <div className="admin-fields-two">
            <label className="admin-field">{language === 'ta' ? 'நிகழ்வு அறிவிப்பு (ஆங்கிலம்)' : 'Event announcement (English)'}<textarea rows="2" value={form.announcementEn} onChange={(event) => updateField('announcementEn', event.target.value)} /></label>
            <label className="admin-field">{language === 'ta' ? 'நிகழ்வு அறிவிப்பு (தமிழ்)' : 'Event announcement (Tamil)'}<textarea rows="2" value={form.announcementTa} onChange={(event) => updateField('announcementTa', event.target.value)} /></label>
          </div>
          <div className="admin-fields-two">
            <label className="admin-field">{language === 'ta' ? 'நிகழ்வு படம் (விருப்பத்தேர்வு)' : 'Event hero image (optional)'}<input type="url" value={form.backgroundImage} onChange={(event) => updateField('backgroundImage', event.target.value)} placeholder="https://" /></label>
            <label className="admin-field">{language === 'ta' ? 'தோற்ற நிறம்' : 'Theme accent'}<span className="color-control"><input type="color" value={form.accent} onChange={(event) => updateField('accent', event.target.value)} /><input value={form.accent} onChange={(event) => updateField('accent', event.target.value)} /></span></label>
          </div>
          <div className="admin-fields-two">
            <label className="admin-field">{t.verseEn}<textarea rows="2" value={form.verseEn} onChange={(event) => updateField('verseEn', event.target.value)} /></label>
            <label className="admin-field">{t.verseTa}<textarea rows="2" value={form.verseTa} onChange={(event) => updateField('verseTa', event.target.value)} /></label>
          </div>
          <div className="admin-fields-three">
            <label className="admin-field">{t.eventDate}<input type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} required /></label>
            <label className="admin-field">{t.starts}<input type="time" value={form.start} onChange={(event) => updateField('start', event.target.value)} required /></label>
            <label className="admin-field">{t.ends}<input type="time" value={form.end} onChange={(event) => updateField('end', event.target.value)} required /></label>
          </div>
          <label className="admin-field">{t.recurrence}
            <select value={form.recurrence} onChange={(event) => updateField('recurrence', event.target.value)}>
              <option value="none">{t.noRepeat}</option>
              <option value="weekly">{t.weekly}</option>
              <option value="monthly">{t.monthly}</option>
              <option value="yearly">{t.yearly}</option>
            </select>
          </label>
          <label className="toggle-label event-theme-toggle">
            <input type="checkbox" checked={form.featured} onChange={(event) => updateField('featured', event.target.checked)} />
            <span>{t.eventFeatured}</span>
          </label>
          <label className="toggle-label event-theme-toggle">
            <input type="checkbox" checked={form.autoTheme} onChange={(event) => updateField('autoTheme', event.target.checked)} />
            <span>{language === 'ta' ? 'இந்த நிகழ்வின்போது தானாகத் தோற்றத்தை மாற்று' : 'Activate a theme during this event'}</span>
          </label>
          {form.autoTheme && (
            <div className="admin-fields-three">
              <label className="admin-field">{t.themeChoice}<select value={form.theme} onChange={(event) => updateField('theme', event.target.value)}>{themeIds.map((id) => <option value={id} key={id}>{labels[id]}</option>)}</select></label>
              <label className="admin-field">{language === 'ta' ? 'தோற்றம் தொடங்கும் நாள்' : 'Theme starts'}<input type="date" value={form.themeStartDate} onChange={(event) => updateField('themeStartDate', event.target.value)} /></label>
              <label className="admin-field">{language === 'ta' ? 'தோற்றம் முடியும் நாள்' : 'Theme ends'}<input type="date" value={form.themeEndDate} onChange={(event) => updateField('themeEndDate', event.target.value)} /></label>
            </div>
          )}
          <div className="admin-event-form-actions">
            <label className="admin-field">{t.publishEvent}
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option value="published">{t.publishEvent}</option>
                <option value="draft">{t.draftEvent}</option>
              </select>
            </label>
            <div>
              {form.id && <button className="button button--neutral" type="button" onClick={() => setForm(emptyForm)}>{t.cancelEdit}</button>}
              <button className="button button--green" type="submit"><Plus size={16} />{form.id ? t.edit : t.addEvent}</button>
            </div>
          </div>
        </form>
      </div>
      <div className="admin-form-section admin-event-list">
        <div className="subsection-title"><Clock3 size={16} /><strong>{t.eventList}</strong></div>
        {draft.events.length ? draft.events.map((event) => (
          <div className="admin-event-row" key={event.id}>
            <div className="admin-event-date">{event.date}</div>
            <div className="admin-event-title">
              <strong>{event.titleEn}</strong>
              <span>{event.titleTa} · {event.start}–{event.end} · {categories[event.category] || categories.other}</span>
              <span className={`event-status-chip event-status-chip--${event.status || 'published'}`}>{event.status === 'draft' ? t.draftEvent : t.publishEvent}</span>
            </div>
            <label className="toggle-label"><input type="checkbox" checked={event.status !== 'draft'} onChange={(inputEvent) => toggle(event.id, { status: inputEvent.target.checked ? 'published' : 'draft' })} /><span>{event.status === 'draft' ? t.draftEvent : t.publishEvent}</span></label>
            <div className="admin-event-actions">
              <button type="button" className="icon-button" aria-label={`${t.edit} ${event.titleEn}`} onClick={() => edit(event)}><Settings2 size={15} /></button>
              <button type="button" className="icon-button icon-button--danger" aria-label={`${t.delete} ${event.titleEn}`} onClick={() => remove(event.id)}><Trash2 size={15} /></button>
            </div>
          </div>
        )) : <p className="admin-help">{t.noEvents}</p>}
      </div>
    </div>
  )
}

function ContentPanel({ language, draft, setDraft }) {
  const t = copy[language].admin
  const updateVerse = (key, value) => setDraft((current) => ({ ...current, verse: { ...current.verse, [key]: value } }))
  const updateSchedule = (service, field, value) => setDraft((current) => ({
    ...current,
    scheduleTimes: { ...current.scheduleTimes, [service]: { ...current.scheduleTimes[service], [field]: value } },
  }))
  return (
    <div className="admin-single-panel">
      <div className="admin-form-section">
        <span className="eyebrow">{t.content}</span>
        <div className="admin-fields-two">
          <label className="admin-field">{t.verseEn}<textarea rows="3" value={draft.verse.en} onChange={(event) => updateVerse('en', event.target.value)} /></label>
          <label className="admin-field">{t.verseTa}<textarea rows="3" value={draft.verse.ta} onChange={(event) => updateVerse('ta', event.target.value)} /></label>
        </div>
        <div className="admin-fields-two">
          <label className="admin-field">{language === 'ta' ? 'திருவசன குறிப்பு (ஆங்கிலம்)' : 'Verse reference (English)'}<input value={draft.verse.referenceEn} onChange={(event) => updateVerse('referenceEn', event.target.value)} /></label>
          <label className="admin-field">{language === 'ta' ? 'திருவசன குறிப்பு (தமிழ்)' : 'Verse reference (Tamil)'}<input value={draft.verse.referenceTa} onChange={(event) => updateVerse('referenceTa', event.target.value)} /></label>
        </div>
      </div>
      <div className="admin-form-section">
        <span className="eyebrow">{language === 'ta' ? 'ஆராதனை நேரங்கள்' : 'Worship schedule'}</span>
        {['sunday', 'communion', 'fasting', 'youth'].map((service) => (
          <div className="schedule-edit-row" key={service}>
            <strong>{t[service]}</strong>
            <label className="admin-field">{t.starts}<input type="time" value={draft.scheduleTimes[service].start} onChange={(event) => updateSchedule(service, 'start', event.target.value)} /></label>
            <label className="admin-field">{t.ends}<input type="time" value={draft.scheduleTimes[service].end} onChange={(event) => updateSchedule(service, 'end', event.target.value)} /></label>
          </div>
        ))}
        <label className="admin-field youth-link-field">{t.youthUrl}<input type="url" value={draft.youthPrayerUrl} onChange={(event) => setDraft((current) => ({ ...current, youthPrayerUrl: event.target.value }))} placeholder="https://" /></label>
        <p className="admin-help">{language === 'ta' ? 'இணைப்பு குறிப்பிடப்படாவிட்டால், ஜெபக் கூட்ட இணைப்பிற்கு ஆலயத்தைத் தொடர்பு கொள்ளுமாறு காட்டப்படும்.' : 'If no link is provided, the website asks visitors to contact the church.'}</p>
      </div>
    </div>
  )
}

function GalleryPanel({ language, draft, setDraft }) {
  const t = copy[language].admin
  const [form, setForm] = useState({ src: '', captionEn: '', captionTa: '' })
  const [formError, setFormError] = useState('')
  const addImage = (event) => {
    event.preventDefault()
    if (!form.src.startsWith('https://')) {
      setFormError(t.galleryHttpsError)
      return
    }
    setFormError('')
    setDraft((current) => ({ ...current, gallery: [...current.gallery, { ...form, id: crypto.randomUUID(), shape: 'landscape' }] }))
    setForm({ src: '', captionEn: '', captionTa: '' })
  }
  return (
    <div className="admin-single-panel">
      <div className="admin-form-section">
        <span className="eyebrow">{t.gallery}</span>
        <form className="admin-event-form" onSubmit={addImage}>
          <label className="admin-field">{t.galleryUrl}<input type="url" value={form.src} onChange={(event) => { setFormError(''); setForm((current) => ({ ...current, src: event.target.value })) }} placeholder="https://…" required /></label>
          <div className="admin-fields-two">
            <label className="admin-field">{t.captionEn}<input value={form.captionEn} onChange={(event) => setForm((current) => ({ ...current, captionEn: event.target.value }))} required /></label>
            <label className="admin-field">{t.captionTa}<input value={form.captionTa} onChange={(event) => setForm((current) => ({ ...current, captionTa: event.target.value }))} required /></label>
          </div>
          {formError && <p className="admin-error" role="alert">{formError}</p>}
          <button className="button button--green" type="submit"><ImagePlus size={16} />{t.addImage}</button>
        </form>
      </div>
      <div className="admin-form-section">
        <div className="subsection-title"><ImagePlus size={16} /><strong>{t.gallery}</strong></div>
        <div className="admin-gallery-list">
          {galleryImages.map((image) => {
            const isVisible = !draft.hiddenGalleryImages.includes(image.id)
            return (
              <div className="admin-gallery-row" key={image.id}>
                <img src={image.src} alt="" loading="lazy" />
                <div><strong>{language === 'ta' ? image.altTa : image.altEn}</strong><span>{language === 'ta' ? t.gallery : 'Default gallery image'}</span></div>
                <label className="toggle-label" title={isVisible ? t.hideImage : t.showImage}>
                  <input type="checkbox" checked={isVisible} onChange={(event) => setDraft((current) => ({
                    ...current,
                    hiddenGalleryImages: event.target.checked
                      ? current.hiddenGalleryImages.filter((id) => id !== image.id)
                      : [...current.hiddenGalleryImages, image.id],
                  }))} />
                  <span>{isVisible ? t.showImage : t.hideImage}</span>
                </label>
              </div>
            )
          })}
        </div>
        {draft.gallery.length ? (
          <div className="admin-gallery-list">
            {draft.gallery.map((image) => (
              <div className="admin-gallery-row" key={image.id}>
                <img src={image.src} alt="" loading="lazy" />
                <div className="admin-gallery-edit-fields">
                  <label className="admin-field">{t.galleryUrl}<input type="url" value={image.src} onChange={(event) => setDraft((current) => ({
                    ...current,
                    gallery: current.gallery.map((item) => item.id === image.id ? { ...item, src: event.target.value } : item),
                  }))} /></label>
                  <label className="admin-field">{t.captionEn}<input value={image.captionEn} onChange={(event) => setDraft((current) => ({
                    ...current,
                    gallery: current.gallery.map((item) => item.id === image.id ? { ...item, captionEn: event.target.value } : item),
                  }))} /></label>
                  <label className="admin-field">{t.captionTa}<input value={image.captionTa} onChange={(event) => setDraft((current) => ({
                    ...current,
                    gallery: current.gallery.map((item) => item.id === image.id ? { ...item, captionTa: event.target.value } : item),
                  }))} /></label>
                </div>
                <button type="button" className="icon-button icon-button--danger" aria-label={`${t.delete} ${image.captionEn}`} onClick={() => setDraft((current) => ({ ...current, gallery: current.gallery.filter((item) => item.id !== image.id) }))}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        ) : <p className="admin-help">{language === 'ta' ? 'தனிப்பயன் படங்கள் எதுவும் சேர்க்கப்படவில்லை.' : 'No additional gallery images have been added.'}</p>}
      </div>
    </div>
  )
}

function ChurchInfoPanel({ language, draft, setDraft }) {
  const t = copy[language].admin
  const update = (key, value) => setDraft((current) => ({
    ...current,
    churchInfo: { ...current.churchInfo, [key]: value },
  }))
  return (
    <div className="admin-single-panel">
      <div className="admin-form-section">
        <span className="eyebrow">{t.churchInfo}</span>
        <div className="admin-fields-two">
          <label className="admin-field">{t.addressEn}<textarea rows="3" value={draft.churchInfo.addressEn} onChange={(event) => update('addressEn', event.target.value)} required /></label>
          <label className="admin-field">{t.addressTa}<textarea rows="3" value={draft.churchInfo.addressTa} onChange={(event) => update('addressTa', event.target.value)} required /></label>
        </div>
        <div className="admin-fields-two">
          <label className="admin-field">{t.landmarksEn}<textarea rows="3" value={draft.churchInfo.landmarksEn} onChange={(event) => update('landmarksEn', event.target.value)} /></label>
          <label className="admin-field">{t.landmarksTa}<textarea rows="3" value={draft.churchInfo.landmarksTa} onChange={(event) => update('landmarksTa', event.target.value)} /></label>
        </div>
        <div className="admin-fields-two">
          <label className="admin-field">{t.phone}<input type="tel" value={draft.churchInfo.phone} onChange={(event) => update('phone', event.target.value)} required /></label>
          <label className="admin-field">{t.registration}<input value={draft.churchInfo.registration} onChange={(event) => update('registration', event.target.value)} /></label>
        </div>
        <p className="admin-help">{language === 'ta' ? 'ஜமாலியா சூப்பர் மார்க்கெட் அருகிலுள்ள வழிகாட்டி அடையாளம் மட்டுமே; ஆலயத்தின் சரியான இடமாகக் காட்டப்படாது.' : 'The public directions link is pinned to nearby Jamaliya Super Market. It is presented only as a nearby landmark, not as the exact church pin.'}</p>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [language, setLanguage] = useState(initialLanguage)
  const [user, setUser] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [draft, setDraft] = useState(() => normalizeConfig(defaultConfig))
  const [activeTab, setActiveTab] = useState('theme')
  const [previewTheme, setPreviewTheme] = useState('normal')
  const [loading, setLoading] = useState(Boolean(supabase))
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const t = copy[language].admin

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem('bethastha-language', language)
    } catch (storageError) {
      console.warn('Could not save the selected language.', storageError)
    }
  }, [language])

  const load = useCallback(async () => {
    if (!supabase) return
    setError('')
    setAuthorized(false)
    setLoading(true)
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      const currentUser = sessionData.session?.user ?? null
      setUser(currentUser)
      if (!currentUser) {
        setAuthorized(false)
        return
      }
      const result = await loadAdminConfig()
      setAuthorized(result.authorized)
      if (result.authorized) {
        setDraft(result.config)
        setDirty(false)
        setHasUnpublishedChanges(result.hasDraft)
      }
    } catch (loadError) {
      console.error('Could not load administrator settings.', loadError)
      setAuthorized(false)
      setError(formatAdminLoadError(loadError, t))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (!supabase) return undefined
    let mounted = true
    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) throw sessionError
      if (mounted) setUser(data.session?.user ?? null)
      if (mounted && data.session?.user) load()
      else if (mounted) setLoading(false)
    }).catch((sessionError) => {
      console.error('Could not restore the admin session.', sessionError)
      if (mounted) {
        setError(t.dataError)
        setLoading(false)
      }
    })
    return () => { mounted = false }
  }, [load, t.dataError])

  const updateDraft = (updater) => {
    setDraft(updater)
    setDirty(true)
    setMessage('')
  }
  const saveDraft = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await saveDraftConfig(draft)
      setDirty(false)
      setHasUnpublishedChanges(true)
      setMessage(t.draftSaved)
    } catch (saveError) {
      console.error('Could not save church website draft.', saveError)
      setError(saveError.message || t.dataError)
    } finally {
      setSaving(false)
    }
  }
  const signOut = async () => {
    if (!supabase) return
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      console.error('Could not sign out of the admin dashboard.', signOutError)
      setError(t.dataError)
      return
    }
    setUser(null)
    setAuthorized(false)
    setDirty(false)
    setHasUnpublishedChanges(false)
  }
  const publish = async () => {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await saveDraftConfig(draft)
      const publishedConfig = {
        ...draft,
        events: draft.events.filter((event) => event.status !== 'draft'),
      }
      await publishConfig(publishedConfig)
      setDirty(false)
      setHasUnpublishedChanges(false)
      setMessage(t.published)
    } catch (publishError) {
      console.error('Could not publish church website settings.', publishError)
      setError(publishError.message || t.dataError)
    } finally {
      setSaving(false)
    }
  }
  const panel = useMemo(() => {
    if (activeTab === 'events') return <EventsPanel language={language} draft={draft} setDraft={updateDraft} />
    if (activeTab === 'content') return <ContentPanel language={language} draft={draft} setDraft={updateDraft} />
    if (activeTab === 'churchInfo') return <ChurchInfoPanel language={language} draft={draft} setDraft={updateDraft} />
    if (activeTab === 'gallery') return <GalleryPanel language={language} draft={draft} setDraft={updateDraft} />
    return <ThemePanel language={language} draft={draft} setDraft={updateDraft} previewTheme={previewTheme} setPreviewTheme={setPreviewTheme} />
  }, [activeTab, language, draft, previewTheme])

  const today = getIstDateKey()
  const upcoming = allEventsBetween(today, addDays(today, 30), draft)
  const nextEvent = upcoming[0]
  const eventCount = draft.events.filter((event) => event.status !== 'draft').length
  const draftEventCount = draft.events.filter((event) => event.status === 'draft').length

  return (
    <div className="admin-page">
      <header className="admin-topbar">
        <a className="brand" href="/">
          <span className="brand-mark"><ShieldCheck size={18} /></span>
          <span className="brand-wordmark"><strong>பெதஸ்தா ஜெப ஆலயம்</strong><small>BETHASTHA PRAYER TEMPLE</small></span>
        </a>
        <div className="admin-top-actions">
          <div className="language-switch" role="group" aria-label="Choose language">
            <button type="button" className={language === 'en' ? 'is-active' : ''} onClick={() => setLanguage('en')}>EN</button>
            <span>/</span>
            <button type="button" className={language === 'ta' ? 'is-active' : ''} onClick={() => setLanguage('ta')}>தமிழ்</button>
          </div>
          <a className="admin-back-link" href="/"><ArrowLeft size={14} />{t.return}</a>
        </div>
      </header>
      <main className="admin-main">
        {!supabase ? (
          <div className="admin-setup-card">
            <span className="admin-login-icon"><ShieldCheck size={24} /></span>
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{t.dashboard}</h1>
            <p>{t.setup}</p>
            <ol className="admin-setup-steps">
              {t.setupSteps.map((step, index) => (
                <li key={step}>
                  {index === 0
                    ? <>{step} <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Supabase dashboard<ArrowUpRight size={12} /></a></>
                    : step}
                </li>
              ))}
            </ol>
            <p className="admin-setup-detail">{t.setupDetail}</p>
            <a className="button button--green" href="/">{t.return}<ArrowUpRight size={15} /></a>
          </div>
        ) : loading ? (
          <div className="admin-loading"><span className="admin-spinner" />{language === 'ta' ? 'ஏற்றுகிறது…' : 'Loading secure dashboard…'}</div>
        ) : !user ? (
          <AdminLogin language={language} onSignedIn={load} />
        ) : error && !authorized ? (
          <div className="admin-setup-card">
            <span className="admin-login-icon"><ShieldCheck size={24} /></span>
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{t.setupErrorTitle}</h1>
            <p className="admin-error" role="alert">{error}</p>
            <button className="button button--green" type="button" onClick={load}>{t.retry}</button>
            <button className="admin-signout" type="button" onClick={signOut}><LogOut size={15} />{t.signOut}</button>
          </div>
        ) : !authorized ? (
          <div className="admin-setup-card">
            <span className="admin-login-icon"><ShieldCheck size={24} /></span>
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>{t.dashboard}</h1>
            <p>{t.unauthorized}</p>
            {error && <div className="admin-error" role="alert">{error}</div>}
            <button className="button button--green" type="button" onClick={signOut}><LogOut size={15} />{t.signOut}</button>
          </div>
        ) : (
          <motion.div className="admin-dashboard" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="admin-dashboard-heading">
              <div><span className="eyebrow">{t.eyebrow}</span><h1>{t.dashboard}</h1><p>{user.email}</p></div>
              <button type="button" className="admin-signout" onClick={signOut}><LogOut size={15} />{t.signOut}</button>
            </div>
            <div className="admin-overview" aria-label={t.dashboard}>
              <article><span>{t.totalUpcoming}</span><strong>{upcoming.length}</strong><small>{language === 'ta' ? 'அடுத்த 30 நாட்கள்' : 'Next 30 days'}</small></article>
              <article><span>{t.publishedEvents}</span><strong>{eventCount}</strong><small>{language === 'ta' ? 'வெளியிடப்பட்ட தனிப்பயன் நிகழ்வுகள்' : 'Published custom events'}</small></article>
              <article><span>{t.draftEvents}</span><strong>{draftEventCount}</strong><small>{language === 'ta' ? 'தனிப்பட்ட வரைவுகள்' : 'Private event drafts'}</small></article>
              <article><span>{t.nextEvent}</span><strong>{nextEvent ? formatDate(nextEvent.date, language, { weekday: 'short', year: undefined }) : '—'}</strong><small>{nextEvent ? eventName(nextEvent, language, copy[language]) : t.noEvents}</small></article>
            </div>
            <div className="admin-status-row">
              <span className="admin-status"><span className="live-dot" />{language === 'ta' ? 'பகிரப்பட்ட இணையதளம்' : 'Shared website configuration'}</span>
              {dirty && <span className="draft-status">{t.pending}</span>}
              {message && <span className="success-status"><Check size={15} />{message}</span>}
              {error && <span className="admin-error" role="alert">{error}</span>}
            </div>
            <div className="admin-workspace">
              <aside className="admin-sidebar">
                <span className="eyebrow">{language === 'ta' ? 'நிர்வகிக்கவும்' : 'MANAGE'}</span>
                {tabs.map((tab) => (
                  <button type="button" key={tab} className={activeTab === tab ? 'is-active' : ''} onClick={() => setActiveTab(tab)}>
                    {tab === 'theme' ? <Settings2 size={16} /> : tab === 'events' ? <Clock3 size={16} /> : tab === 'content' ? <Save size={16} /> : tab === 'churchInfo' ? <ShieldCheck size={16} /> : <ImagePlus size={16} />}
                    {t[tab]}
                  </button>
                ))}
                <div className="admin-sidebar-note"><ShieldCheck size={17} /><span>{language === 'ta' ? 'உங்கள் மாற்றங்கள் வெளியிடும் வரை தனிப்பட்டவை.' : 'Drafts remain private until you publish.'}</span></div>
              </aside>
              <section className="admin-editor" aria-live="polite">
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
                    {panel}
                  </motion.div>
                </AnimatePresence>
                <div className="admin-publish-bar">
                  <span>{dirty ? t.pending : language === 'ta' ? 'அனைத்து மாற்றங்களும் சேமிக்கப்பட்டுள்ளன.' : 'Your published website is up to date.'}</span>
                  <div className="admin-publish-actions">
                    <button className="button button--neutral" type="button" disabled={saving || !dirty} onClick={saveDraft}>
                      {saving ? t.savingDraft : t.saveDraft}<Save size={15} />
                    </button>
                    <button className="button button--gold" type="button" disabled={saving || (!dirty && !hasUnpublishedChanges)} onClick={publish}>
                    {saving ? t.publishing : t.publish}<ArrowUpRight size={15} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        )}
      </main>
      <footer className="admin-footer"><span>© 2026 Bethastha Prayer Temple</span><span>{language === 'ta' ? 'தேவனுக்கே மகிமை' : 'To God be the glory.'}</span></footer>
    </div>
  )
}
