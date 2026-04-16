// Configuración dinámica de la URL Base
// Si detecta que el navegador está en localhost, apunta al puerto 8000 local.
// Si no, usa la URL de Render.
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'unstriped-uncongenially-terrence.ngrok-free.dev'
  ? 'http://localhost:8000'
  : 'https://api-tallaje.onrender.com';

const BASE = `${API_BASE_URL}/api`;

async function req(method, path, body) {
  const opts = {
    method,
    headers: {},
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(BASE + path, opts);

    if (res.status === 204) return null;

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const d = err.detail;
      const msg = Array.isArray(d) 
        ? d.map(x => x.msg ?? JSON.stringify(x)).join(', ') 
        : (d || 'Error desconocido');
      throw new Error(typeof msg === 'string' ? msg : 'Error desconocido');
    }

    return res.json();
  } catch (error) {
    console.error("Error en la petición API:", error);
    throw error;
  }
}

export const api = {
  // Personas
  buscarPersonas: q => req('GET', `/personas/?q=${encodeURIComponent(q ?? '')}`),
  crearPersona: data => req('POST', '/personas/', data),
  obtenerPersona: id => req('GET', `/personas/${id}`),
  eliminarPersona: id => req('DELETE', `/personas/${id}`),
  medicionesDePersona: id => req('GET', `/personas/${id}/mediciones`),

  // Mediciones
  crearMedicion: data => req('POST', '/mediciones/', data),
  obtenerMedicion: id => req('GET', `/mediciones/${id}`),
  eliminarMedicion: id => req('DELETE', `/mediciones/${id}`),

  // Rangos
  listarRangos: prenda => req('GET', `/rangos/?prenda=${prenda}`),
  actualizarRango: (id, data) => req('PUT', `/rangos/${id}`, data),

  // Reporte
  reporteTallas: () => req('GET', '/reporte/tallas'),
  resumen: () => req('GET', '/reporte/resumen'),

  // Configuracion
  listarConfig: () => req('GET', '/configuracion/'),
  actualizarConfig: (clave, valor) => req('PUT', `/configuracion/${clave}`, { valor }),
};