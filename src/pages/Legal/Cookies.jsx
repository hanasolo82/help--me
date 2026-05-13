import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'

// Politica de cookies LSSI-CE: inventario detallado, finalidad, duracion y como revocar.
export default function Cookies() {
  return (
    <LegalLayout title="Politica de cookies" lastUpdated="2026-05-13">
      <section>
        <h2>1. ¿Que son las cookies y el almacenamiento local?</h2>
        <p>
          Una <strong>cookie</strong> es un pequeno fichero que se descarga en tu dispositivo cuando visitas una
          pagina y permite identificarte. El <strong>almacenamiento local</strong> (<code>localStorage</code>) es un
          mecanismo del navegador con la misma finalidad practica. Esta politica trata ambos por igual conforme al
          articulo 22 de la LSSI-CE.
        </p>
      </section>

      <section>
        <h2>2. Responsable</h2>
        <p>
          El responsable del uso de cookies es <strong>[NOMBRE Y APELLIDOS]</strong>, NIF/NIE{' '}
          <strong>[NIF_O_NIE]</strong>. Mas datos en la{' '}
          <Link to="/legal/privacy">Politica de privacidad</Link>.
        </p>
      </section>

      <section>
        <h2>3. Cookies y datos locales que usamos</h2>
        <p>
          helpMe usa exclusivamente cookies y almacenamiento local <strong>de primera parte</strong>. No usamos
          cookies publicitarias ni perfiladoras. El siguiente inventario es el real:
        </p>

        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Proveedor</th>
              <th>Tipo</th>
              <th>Finalidad</th>
              <th>Duracion</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>sb-*-auth-token</code></td>
              <td>Supabase</td>
              <td>Necesaria (localStorage)</td>
              <td>Mantener la sesion autenticada (JWT) y refrescar tokens.</td>
              <td>Hasta cierre de sesion o expiracion del token.</td>
            </tr>
            <tr>
              <td><code>helpme-consent-v1</code></td>
              <td>helpMe</td>
              <td>Necesaria (localStorage)</td>
              <td>Guardar tu eleccion sobre cookies para no preguntarte de nuevo.</td>
              <td>12 meses.</td>
            </tr>
            <tr>
              <td><code>helpme-last-email</code></td>
              <td>helpMe</td>
              <td>Preferencias (localStorage)</td>
              <td>
                Recordar el ultimo email usado para que en el siguiente login solo tengas que introducir la
                contrasena.
              </td>
              <td>Hasta que pulses "Usar otra cuenta" o cierres sesion.</td>
            </tr>
            <tr>
              <td><code>cf_clearance, __cf_bm</code></td>
              <td>Cloudflare (Turnstile)</td>
              <td>Necesaria</td>
              <td>Identificar trafico legitimo, mitigar abuso y bots en formularios sensibles.</td>
              <td>30 minutos a 1 ano segun caso (gestion Cloudflare).</td>
            </tr>
          </tbody>
        </table>

        <p>
          Las cargas de teselas de OpenStreetMap y de la API GeoJS pueden generar cookies tecnicas en sus dominios.
          Como helpMe no controla esos dominios, te remitimos a sus politicas:{' '}
          <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" rel="noreferrer noopener" target="_blank">OSM</a>{' '}y{' '}
          <a href="https://www.geojs.io/" rel="noreferrer noopener" target="_blank">GeoJS</a>.
        </p>
      </section>

      <section>
        <h2>4. Categorias</h2>
        <ul>
          <li>
            <strong>Estrictamente necesarias</strong>: imprescindibles para que la app funcione (mantener sesion,
            recordar tu eleccion de cookies, protegerte de abuso). No requieren consentimiento.
          </li>
          <li>
            <strong>Preferencias</strong>: mejoran tu experiencia recordando el ultimo email usado o el modo visual
            elegido. Se activan solo si lo aceptas.
          </li>
          <li>
            <strong>Analiticas</strong>: hoy <em>no usamos ninguna</em>. Si las anadimos te volveremos a pedir
            consentimiento antes de cargarlas.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Como gestionar o revocar tu consentimiento</h2>
        <p>
          Puedes cambiar tu eleccion en cualquier momento desde el enlace{' '}
          <strong>"Cookies"</strong> del pie de pagina o eliminando la clave <code>helpme-consent-v1</code> de tu
          almacenamiento local. Tambien puedes bloquear/borrar cookies desde la configuracion de tu navegador:
        </p>
        <ul>
          <li>
            <a
              href="https://support.google.com/chrome/answer/95647"
              rel="noreferrer noopener"
              target="_blank"
            >
              Google Chrome
            </a>
          </li>
          <li>
            <a
              href="https://support.mozilla.org/es/kb/proteccion-cookies-rastreo-mejorada-firefox-escrito"
              rel="noreferrer noopener"
              target="_blank"
            >
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a
              href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
              rel="noreferrer noopener"
              target="_blank"
            >
              Safari
            </a>
          </li>
          <li>
            <a
              href="https://support.microsoft.com/es-es/microsoft-edge"
              rel="noreferrer noopener"
              target="_blank"
            >
              Microsoft Edge
            </a>
          </li>
        </ul>
        <p>
          Bloquear las cookies necesarias puede impedir que partes de helpMe funcionen correctamente.
        </p>
      </section>

      <section>
        <h2>6. Cambios</h2>
        <p>
          Si modificamos las cookies que usamos o anadimos nuevas categorias, actualizaremos esta politica y
          volveremos a solicitar tu consentimiento cuando proceda.
        </p>
      </section>
    </LegalLayout>
  )
}
