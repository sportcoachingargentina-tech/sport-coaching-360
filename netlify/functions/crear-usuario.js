// ═══════════════════════════════════════════════════════════════
// SC360 · Crear usuario (Supabase Auth) — 28/10/2026
// Antes cualquiera en internet podía llamar a esta función y crear una
// cuenta confirmada. Ahora solo la puede usar alguien con sesión
// iniciada en el panel que sea admin o coordinador habilitado.
// La clave de servicio sigue viviendo solo en Netlify (variable
// SUPABASE_SERVICE_KEY), nunca en el navegador.
// ═══════════════════════════════════════════════════════════════
const SB_URL = 'https://gltqhcnusblfovhxljcs.supabase.co';
const ORIGENES = ['https://app.sportcoachingpro.com'];

function cors(event) {
  const o = (event.headers && (event.headers.origin || event.headers.Origin)) || '';
  return {
    'Access-Control-Allow-Origin': ORIGENES.includes(o) ? o : ORIGENES[0],
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
}
const responder = (event, code, body) => ({ statusCode: code, headers: cors(event), body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(event), body: '' };
  if (event.httpMethod !== 'POST') return responder(event, 405, { error: 'Método no permitido' });

  const SR_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SR_KEY) return responder(event, 500, { error: 'Falta configurar la clave del servidor' });

  // 1) Quién llama: tiene que traer la sesión del panel
  const auth = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return responder(event, 401, { error: 'Iniciá sesión en el panel para crear usuarios' });

  let emailQuienLlama = '';
  try {
    const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SR_KEY, Authorization: 'Bearer ' + token } });
    if (!r.ok) return responder(event, 401, { error: 'La sesión venció: volvé a entrar al panel' });
    const u = await r.json();
    emailQuienLlama = String(u.email || '').toLowerCase();
  } catch (e) {
    return responder(event, 502, { error: 'No se pudo verificar la sesión' });
  }

  // 2) Tiene que ser admin o coordinador habilitado
  try {
    const r = await fetch(SB_URL + '/rest/v1/usuarios?select=rol,habilitado&email=ilike.' + encodeURIComponent(emailQuienLlama.replace(/([%_\\])/g, '\\$1')) + '&limit=1',
      { headers: { apikey: SR_KEY, Authorization: 'Bearer ' + SR_KEY } });
    const filas = r.ok ? await r.json() : [];
    const yo = filas[0];
    if (!yo || yo.habilitado === false || !['admin', 'coordinador'].includes(yo.rol)) {
      return responder(event, 403, { error: 'Tu usuario no tiene permiso para crear usuarios' });
    }
  } catch (e) {
    return responder(event, 502, { error: 'No se pudo verificar el permiso' });
  }

  // 3) Datos del usuario nuevo
  let datos = {};
  try { datos = JSON.parse(event.body || '{}'); } catch (e) { return responder(event, 400, { error: 'Datos inválidos' }); }
  const email = String(datos.email || '').trim().toLowerCase();
  const password = String(datos.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return responder(event, 400, { error: 'Email inválido' });
  if (password.length < 6) return responder(event, 400, { error: 'La contraseña debe tener al menos 6 caracteres' });

  // 4) Crear la cuenta
  const resp = await fetch(SB_URL + '/auth/v1/admin/users', {
    method: 'POST',
    headers: { apikey: SR_KEY, Authorization: 'Bearer ' + SR_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return responder(event, 400, { error: data.msg || data.message || 'Error al crear usuario (¿el email ya está en uso?)' });

  return responder(event, 200, { id: data.id, email: data.email });
};
