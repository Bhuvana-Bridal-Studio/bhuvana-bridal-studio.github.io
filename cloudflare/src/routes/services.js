import { jsonResponse, errorResponse } from '../utils/response.js';

const SERVICE_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DIVISIONS = {
  'bridal-beauty': 'Bridal & Beauty Studio',
  'designer-blouse': 'Designer Blouse Studio'
};

function readStoredService(row) {
  let service = {};
  try { service = JSON.parse(row.service_json || '{}'); } catch {}
  return {
    id: row.service_id,
    service,
    deleted: Number(row.is_deleted) === 1,
    updated_at: row.updated_at || null
  };
}

async function listServiceOverrides(request, env, cacheControl) {
  if (!env.DB) return errorResponse(request, env, 'Service catalog database unavailable', 503, 'SERVICE_UNAVAILABLE');
  const result = await env.DB.prepare('SELECT service_id, service_json, is_deleted, updated_at FROM service_catalog_overrides ORDER BY service_id').all();
  return jsonResponse(request, env, { success: true, services: (result.results || []).map(readStoredService) }, 200, { 'Cache-Control': cacheControl });
}

export async function handlePublicServices(request, env) {
  try {
    return await listServiceOverrides(request, env, 'no-store');
  } catch (err) {
    console.error('[Services: PublicList]', err);
    return errorResponse(request, env, 'Service catalog is unavailable', 500, 'INTERNAL_ERROR');
  }
}

export async function handleOwnerServices(request, env) {
  try {
    return await listServiceOverrides(request, env, 'private, no-store');
  } catch (err) {
    console.error('[Services: OwnerList]', err);
    return errorResponse(request, env, 'Service catalog is unavailable', 500, 'INTERNAL_ERROR');
  }
}

function validateService(service, routeId) {
  if (!service || typeof service !== 'object' || Array.isArray(service)) return null;
  const id = String(service.id || routeId || '').trim().toLowerCase();
  if (!SERVICE_ID_PATTERN.test(id) || id !== routeId) return null;
  const title = String(service.title || '').trim();
  const divisionId = String(service.divisionId || '').trim();
  const description = String(service.description || '').trim();
  const pricingDisplay = String(service.pricingDisplay || '').trim();
  const category = String(service.category || 'Custom Services').trim();
  const categoryId = String(service.categoryId || 'custom-services').trim().toLowerCase();
  if (!title || title.length > 100 || !DIVISIONS[divisionId] || !description || description.length > 2000 || !pricingDisplay || pricingDisplay.length > 180) return null;
  if (!/^[a-z0-9-]{1,60}$/.test(categoryId) || category.length > 80) return null;
  const categoryPage = divisionId === 'bridal-beauty' ? 'bridal-beauty.html' : 'designer-blouse.html';
  const image = typeof service.image === 'string' && /^[a-z0-9_./-]{1,240}$/i.test(service.image) && !service.image.includes('..')
    ? service.image : '';
  const priceOptions = Array.isArray(service.priceOptions)
    ? service.priceOptions.slice(0, 10).map(value => String(value).slice(0, 80))
    : [];
  return {
    ...service,
    id,
    title,
    divisionId,
    division: DIVISIONS[divisionId],
    category,
    categoryId,
    categoryPage,
    tagline: String(service.tagline || description).trim().slice(0, 180),
    summary: String(service.summary || description).trim().slice(0, 240),
    description,
    pricingType: String(service.pricingType || 'quote').slice(0, 40),
    pricingDisplay,
    pricingNote: String(service.pricingNote || '').trim().slice(0, 500),
    priceOptions,
    image,
    featured: Boolean(service.featured),
    requirementsType: String(service.requirementsType || 'general').slice(0, 60)
  };
}

export async function handleOwnerServiceSave(request, env, auth, serviceId) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Service catalog database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const routeId = String(serviceId || '').toLowerCase();
    let body;
    try { body = await request.json(); }
    catch { return errorResponse(request, env, 'Invalid JSON body', 400, 'INVALID_JSON'); }
    const service = validateService(body?.service, routeId);
    if (!service) return errorResponse(request, env, 'Service details are invalid', 400, 'INVALID_SERVICE');
    await env.DB.prepare(`INSERT INTO service_catalog_overrides (service_id, service_json, is_deleted, updated_at)
      VALUES (?, ?, 0, datetime('now'))
      ON CONFLICT(service_id) DO UPDATE SET service_json = excluded.service_json, is_deleted = 0, updated_at = datetime('now')`)
      .bind(routeId, JSON.stringify(service)).run();
    return jsonResponse(request, env, { success: true, service });
  } catch (err) {
    console.error('[Services: Save]', err);
    return errorResponse(request, env, 'Service could not be saved', 500, 'SAVE_FAILED');
  }
}

export async function handleOwnerServiceDelete(request, env, auth, serviceId) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Service catalog database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const id = String(serviceId || '').toLowerCase();
    if (!SERVICE_ID_PATTERN.test(id)) return errorResponse(request, env, 'Service ID is invalid', 400, 'INVALID_SERVICE');
    await env.DB.prepare(`INSERT INTO service_catalog_overrides (service_id, service_json, is_deleted, updated_at)
      VALUES (?, '{}', 1, datetime('now'))
      ON CONFLICT(service_id) DO UPDATE SET is_deleted = 1, updated_at = datetime('now')`)
      .bind(id).run();
    return jsonResponse(request, env, { success: true, deleted: id });
  } catch (err) {
    console.error('[Services: Delete]', err);
    return errorResponse(request, env, 'Service could not be deleted', 500, 'DELETE_FAILED');
  }
}
