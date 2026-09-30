import { supabase } from "./supabaseClient";

// Maps a `flights` row (Supabase) back to the "week entry" shape the rest of
// the app already works with (see makeNewProject / ReceivingEngine.finish in App.jsx).
function mapFlightRowToWeek(row) {
  return {
    n: row.n,
    date: row.date,
    real: true,
    dataUrl: row.hero_data_url,
    sourceCount: row.source_count,
    trades: row.trades || [],
    photos: row.photos || [],
    media: row.media || [],
    note: row.note || undefined,
    noteMode: row.note_mode || undefined,
    status: row.status,
    statusReason: row.status_reason || undefined,
  };
}

// Maps a `sites` row (+ its flights) back to the flat "raw" site shape that
// hydrateSite() in App.jsx already knows how to turn into an app-ready site
// (adds the resolved icon component). Keeping this shape identical to the
// localStorage one means the rest of the app needs no changes to consume it.
function mapSiteRowToRaw(row, flightRows) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    client: row.client,
    type: row.type,
    mode: row.mode === "realEstate" ? "realEstate" : "construction",
    iconKey: row.icon_key,
    lat: row.lat,
    lon: row.lon,
    geofenceRadiusM: row.geofence_radius_m,
    accessCode: row.access_code,
    clientAccessEnabled: row.client_access_enabled,
    listing: row.listing || { photos: [], capturedDate: null, description: "", descriptionMode: "manual" },
    _weeks: (flightRows || []).map(mapFlightRowToWeek).sort((a, b) => a.n - b.n),
  };
}

async function currentOwnerId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not signed in.");
  return data.user.id;
}

export async function fetchOperatorSites() {
  const { data, error } = await supabase
    .from("sites")
    .select("*, flights(*)")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((row) => mapSiteRowToRaw(row, row.flights));
}

export async function createSite(appSite) {
  const ownerId = await currentOwnerId();
  const { error } = await supabase.from("sites").insert({
    id: appSite.id,
    owner_id: ownerId,
    name: appSite.name,
    address: appSite.address,
    client: appSite.client,
    type: appSite.type,
    mode: appSite.mode,
    icon_key: appSite.iconKey,
    lat: appSite.lat,
    lon: appSite.lon,
    access_code: appSite.accessCode,
    client_access_enabled: appSite.clientAccessEnabled,
    listing: appSite.listing,
  });
  if (error) throw error;
}

export async function updateSite(appSite) {
  const { error } = await supabase
    .from("sites")
    .update({
      name: appSite.name,
      address: appSite.address,
      client: appSite.client,
      type: appSite.type,
      mode: appSite.mode,
      icon_key: appSite.iconKey,
      lat: appSite.lat,
      lon: appSite.lon,
      access_code: appSite.accessCode,
      client_access_enabled: appSite.clientAccessEnabled,
    })
    .eq("id", appSite.id);
  if (error) throw error;
}

export async function deleteSite(id) {
  const { error } = await supabase.from("sites").delete().eq("id", id);
  if (error) throw error;
}

export async function addFlight(siteId, week) {
  const { error } = await supabase.from("flights").insert({
    id: `${siteId}-f${week.n}`,
    site_id: siteId,
    n: week.n,
    date: week.date,
    source_count: week.sourceCount,
    hero_data_url: week.dataUrl,
    photos: week.photos || [],
    media: week.media || [],
    trades: week.trades || [],
    note: week.note || null,
    note_mode: week.noteMode || null,
    status: "ready",
  });
  if (error) throw error;
}

export async function updateFlightTrades(siteId, n, trades) {
  const { error } = await supabase.from("flights").update({ trades }).eq("site_id", siteId).eq("n", n);
  if (error) throw error;
}

export async function updateFlightNote(siteId, n, note, noteMode) {
  const { error } = await supabase
    .from("flights")
    .update({ note, note_mode: noteMode })
    .eq("site_id", siteId)
    .eq("n", n);
  if (error) throw error;
}

export async function updateFlightMedia(siteId, n, media) {
  const { error } = await supabase.from("flights").update({ media }).eq("site_id", siteId).eq("n", n);
  if (error) throw error;
}

export async function updateListing(siteId, listing) {
  const { error } = await supabase.from("sites").update({ listing }).eq("id", siteId);
  if (error) throw error;
}

// Client-portal "enter your project access code" flow — works with no
// Supabase auth session because get_site_by_access_code() is a SECURITY
// DEFINER function that only ever returns the one matching project.
export async function getSiteByAccessCode(code) {
  const { data, error } = await supabase.rpc("get_site_by_access_code", { p_code: code });
  if (error) throw error;
  if (!data) return null;
  return mapSiteRowToRaw(data.site, data.flights);
}

// Share-link tokens (unguessable, optional expiry, revocable). The CRUD UI for
// these lands with the navigation/sharing section; the table + RLS + this
// read path already exist so that section is additive, not a schema change.
export async function getSharedProject(token) {
  const { data, error } = await supabase.rpc("get_shared_project", { p_token: token });
  if (error) throw error;
  if (!data) return null;
  return mapSiteRowToRaw(data.site, data.flights);
}

export async function createShareLink(siteId, { expiresAt } = {}) {
  const ownerId = await currentOwnerId();
  const token = crypto.randomUUID().replace(/-/g, "");
  const { data, error } = await supabase
    .from("share_links")
    .insert({ site_id: siteId, token, created_by: ownerId, expires_at: expiresAt || null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listShareLinks(siteId) {
  const { data, error } = await supabase
    .from("share_links")
    .select("*")
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function revokeShareLink(id) {
  const { error } = await supabase.from("share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
