import { createClient } from '@supabase/supabase-js'
import { defaultConfig } from '../data/content'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null

function contextualizeError(resource, error) {
  const contextualError = new Error(`${resource}: ${error.message}`)
  contextualError.code = error.code
  throw contextualError
}

export function normalizeConfig(value) {
  if (!value || typeof value !== 'object') return structuredClone(defaultConfig)
  return {
    ...structuredClone(defaultConfig),
    ...value,
    announcement: { ...defaultConfig.announcement, ...value.announcement },
    verse: { ...defaultConfig.verse, ...value.verse },
    scheduleTimes: {
      sunday: { ...defaultConfig.scheduleTimes.sunday, ...value.scheduleTimes?.sunday },
      communion: { ...defaultConfig.scheduleTimes.communion, ...value.scheduleTimes?.communion },
      fasting: { ...defaultConfig.scheduleTimes.fasting, ...value.scheduleTimes?.fasting },
      youth: { ...defaultConfig.scheduleTimes.youth, ...value.scheduleTimes?.youth },
    },
    festivals: value.festivals ?? {},
    events: Array.isArray(value.events) ? value.events : [],
    gallery: Array.isArray(value.gallery) ? value.gallery : [],
    hiddenGalleryImages: Array.isArray(value.hiddenGalleryImages) ? value.hiddenGalleryImages : [],
    churchInfo: { ...defaultConfig.churchInfo, ...value.churchInfo },
  }
}

export async function fetchPublishedConfig() {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('site_config')
    .select('published')
    .eq('id', 'public')
    .maybeSingle()
  if (error) throw error
  return data?.published ? normalizeConfig(data.published) : null
}

export async function loadAdminConfig() {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) contextualizeError('Supabase Auth user lookup', userError)
  const userId = userData.user?.id
  if (!userId) return { authorized: false }

  const { data: membership, error: membershipError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (membershipError) contextualizeError('public.admin_users.user_id lookup', membershipError)
  if (membership?.user_id !== userId) return { authorized: false }
  const [publishedResult, draftResult] = await Promise.all([
    supabase
    .from('site_config')
    .select('published')
    .eq('id', 'public')
    .maybeSingle(),
    supabase
      .from('site_drafts')
      .select('content, is_published')
      .eq('id', 'admin')
      .maybeSingle(),
  ])
  if (publishedResult.error) contextualizeError('public.site_config(published) lookup', publishedResult.error)
  if (draftResult.error) contextualizeError('public.site_drafts(content, is_published) lookup', draftResult.error)
  return {
    authorized: true,
    config: normalizeConfig(draftResult.data?.content ?? publishedResult.data?.published),
    hasDraft: Boolean(draftResult.data?.content) && !draftResult.data.is_published,
  }
}

export async function saveDraftConfig(config) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Please sign in again before saving a draft.')
  const { error } = await supabase
    .from('site_drafts')
    .upsert(
      { id: 'admin', content: config, updated_at: new Date().toISOString(), updated_by: userId, is_published: false },
      { onConflict: 'id' },
    )
  if (error) throw error
}

export async function publishConfig(config) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase
    .rpc('publish_site_config', { p_published: config })
  if (error) throw error
}
