import LegalLayout from './LegalLayout'

// Politica de privacidad ajustada a lo que helpMe realmente trata: Supabase EU, Turnstile,
// Google OAuth opcional, OpenStreetMap, GeoJS y Storage publico de imagenes.
// Los datos identificativos del responsable van entre corchetes para que el titular los rellene.
export default function Privacy() {
  return (
    <LegalLayout title="Politica de privacidad" lastUpdated="2026-05-13">
      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable del tratamiento de tus datos personales es <strong>[NOMBRE Y APELLIDOS]</strong>, persona
          fisica con NIF/NIE <strong>[NIF_O_NIE]</strong>, domicilio a efectos de notificaciones en{' '}
          <strong>[DIRECCION POSTAL]</strong> y correo electronico de contacto{' '}
          <a href="mailto:helpme.app.contact@gmail.com">helpme.app.contact@gmail.com</a>{' '}
          (en adelante, <em>helpMe</em>).
        </p>
        <p>
          Esta politica se rige por el Reglamento (UE) 2016/679 (RGPD), la Ley Organica 3/2018 de Proteccion de Datos
          y Garantia de los Derechos Digitales (LOPDGDD) y la Ley 34/2002 de Servicios de la Sociedad de la
          Informacion (LSSI-CE).
        </p>
      </section>

      <section>
        <h2>2. Datos que tratamos</h2>
        <p>helpMe trata las siguientes categorias de datos personales:</p>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Datos concretos</th>
              <th>Origen</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Identificacion y autenticacion</td>
              <td>Correo electronico, contrasena (almacenada con hash bcrypt por Supabase), proveedor OAuth (Google) si lo utilizas, fecha de creacion de la cuenta.</td>
              <td>Aportado por ti durante el registro o al iniciar sesion con Google.</td>
            </tr>
            <tr>
              <td>Perfil publico</td>
              <td>Nombre de usuario, nombre completo, barrio/zona, avatar y, en su caso, indicador de verificacion.</td>
              <td>Aportado por ti durante el onboarding.</td>
            </tr>
            <tr>
              <td>Tareas y contenido publicado</td>
              <td>Titulo, descripcion, categoria, urgencia, precio sugerido, coordenadas geograficas y, opcionalmente, fotografias adjuntas.</td>
              <td>Aportado por ti al publicar una tarea.</td>
            </tr>
            <tr>
              <td>Comunicaciones internas</td>
              <td>Mensajes de chat enviados al usuario asociado a una tarea aceptada.</td>
              <td>Generado al usar el chat.</td>
            </tr>
            <tr>
              <td>Valoraciones y reputacion</td>
              <td>Puntuacion (1 a 5), comentario opcional, nota media y numero de tareas completadas.</td>
              <td>Aportado por ti tras completar una tarea.</td>
            </tr>
            <tr>
              <td>Datos tecnicos</td>
              <td>Direccion IP usada para anti-abuso y geolocalizacion aproximada, identificador de sesion JWT, agente de usuario.</td>
              <td>Recogido automaticamente por Supabase y por Cloudflare Turnstile.</td>
            </tr>
            <tr>
              <td>Geolocalizacion</td>
              <td>Coordenadas latitud/longitud aproximadas o precisas si concedes el permiso del navegador.</td>
              <td>API Geolocation del navegador o GeoJS (IP) como fallback.</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>No tratamos categorias especiales de datos</strong> (salud, ideologia, religion, datos biometricos,
          orientacion sexual, etc.). Te pedimos que no incluyas este tipo de informacion en tus tareas, mensajes o
          imagenes.
        </p>
      </section>

      <section>
        <h2>3. Finalidades y bases juridicas</h2>
        <table>
          <thead>
            <tr>
              <th>Finalidad</th>
              <th>Base juridica (art. 6 RGPD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Crear y mantener tu cuenta y profile.</td>
              <td>Ejecucion de un contrato (art. 6.1.b).</td>
            </tr>
            <tr>
              <td>Publicar tareas, aceptar tareas, chatear y valorar a otros usuarios.</td>
              <td>Ejecucion de un contrato (art. 6.1.b).</td>
            </tr>
            <tr>
              <td>Geolocalizacion precisa para sugerir tareas cercanas.</td>
              <td>Consentimiento explicito mediante el permiso del navegador (art. 6.1.a).</td>
            </tr>
            <tr>
              <td>Anti-fraude (Cloudflare Turnstile), prevencion de abuso, auditoria de RLS.</td>
              <td>Interes legitimo (art. 6.1.f), ponderado frente a tus derechos.</td>
            </tr>
            <tr>
              <td>Recordar tu email en el dispositivo para acelerar futuros inicios de sesion.</td>
              <td>Consentimiento (banner de cookies, art. 6.1.a y art. 22 LSSI).</td>
            </tr>
            <tr>
              <td>Cumplir obligaciones legales (fiscales, requerimientos judiciales).</td>
              <td>Cumplimiento de obligacion legal (art. 6.1.c).</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>4. Destinatarios y encargados del tratamiento</h2>
        <p>
          helpMe no vende tus datos. Los compartimos unicamente con los siguientes <strong>encargados del
          tratamiento</strong>, todos sujetos a contrato conforme al art. 28 RGPD:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.</strong> — proveedor de base de datos PostgreSQL, autenticacion, almacenamiento
            (imagenes) y Realtime. Region de procesamiento: <em>UE (Frankfurt, eu-central-1)</em>. Politica de
            privacidad: <a href="https://supabase.com/privacy" rel="noreferrer noopener" target="_blank">supabase.com/privacy</a>.
          </li>
          <li>
            <strong>Cloudflare, Inc.</strong> — proveedor del reto CAPTCHA Turnstile en formularios de registro,
            login y recuperacion. Procesa direccion IP y huellas tecnicas anonimas. Politica:{' '}
            <a href="https://www.cloudflare.com/privacypolicy/" rel="noreferrer noopener" target="_blank">cloudflare.com/privacypolicy</a>.
          </li>
          <li>
            <strong>Google Ireland Limited</strong> — proveedor OAuth opcional. Solo si eliges "Continuar con
            Google". Recibimos email, nombre y avatar publico que Google decide compartir. Politica:{' '}
            <a href="https://policies.google.com/privacy" rel="noreferrer noopener" target="_blank">policies.google.com/privacy</a>.
          </li>
          <li>
            <strong>OpenStreetMap Foundation</strong> — servidor de teselas del mapa publico. La carga de teselas
            implica el envio de tu IP al servidor de teselas. Politica:{' '}
            <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" rel="noreferrer noopener" target="_blank">wiki.osmfoundation.org</a>.
          </li>
          <li>
            <strong>GeoJS</strong> — servicio gratuito de geolocalizacion por IP usado como fallback si rechazas la
            geolocalizacion del navegador. Recibe tu IP publica. Politica:{' '}
            <a href="https://www.geojs.io/" rel="noreferrer noopener" target="_blank">geojs.io</a>.
          </li>
        </ul>
        <p>
          Tambien podemos comunicar datos a las autoridades publicas, jueces y tribunales cuando exista una
          obligacion legal o un requerimiento valido.
        </p>
      </section>

      <section>
        <h2>5. Transferencias internacionales</h2>
        <p>
          Supabase aloja tus datos en la region UE (Frankfurt). Cloudflare y Google pueden tratar datos fuera del
          EEE, en cuyo caso lo hacen amparados por las <em>Clausulas Contractuales Tipo</em> aprobadas por la
          Comision Europea (Decision 2021/914) y medidas suplementarias (cifrado en transito y en reposo,
          pseudonimizacion).
        </p>
      </section>

      <section>
        <h2>6. Plazos de conservacion</h2>
        <ul>
          <li>Cuenta y profile: mientras mantengas la cuenta activa.</li>
          <li>Tareas, chats y valoraciones: hasta 24 meses despues de completarse o cancelarse, salvo obligacion
            legal de conservacion superior.</li>
          <li>Imagenes en Storage: se eliminan al borrar la tarea asociada.</li>
          <li>Datos tecnicos anti-abuso: hasta 12 meses.</li>
          <li>Datos requeridos por obligacion legal (p. ej. fiscal): hasta el plazo legal de prescripcion (con
            caracter general, 4-6 anos segun la normativa aplicable).</li>
        </ul>
        <p>
          Si solicitas la supresion, eliminaremos o pseudonimizaremos tus datos en el plazo maximo de 30 dias, salvo
          los que debamos conservar por obligacion legal, bloqueandolos para que solo sean accesibles ante
          requerimiento.
        </p>
      </section>

      <section>
        <h2>7. Tus derechos</h2>
        <p>Puedes ejercer en cualquier momento los siguientes derechos:</p>
        <ul>
          <li><strong>Acceso</strong>: saber que datos tuyos tratamos.</li>
          <li><strong>Rectificacion</strong>: corregir datos inexactos o incompletos.</li>
          <li><strong>Supresion ("derecho al olvido")</strong>: pedir que borremos tus datos.</li>
          <li><strong>Limitacion</strong>: que solo los conservemos sin tratarlos.</li>
          <li><strong>Oposicion</strong>: oponerte a tratamientos basados en interes legitimo.</li>
          <li><strong>Portabilidad</strong>: obtener tus datos en formato estructurado y legible por maquina.</li>
          <li><strong>Retirar el consentimiento</strong> en cualquier momento, sin efectos retroactivos.</li>
          <li><strong>No ser objeto de decisiones automatizadas</strong>: helpMe no toma decisiones automatizadas
            con efectos juridicos significativos sobre ti.</li>
        </ul>
        <p>
          Para ejercer estos derechos escribe a{' '}
          <a href="mailto:helpme.app.contact@gmail.com">helpme.app.contact@gmail.com</a>{' '}
          identificandote suficientemente. Si consideras que no atendemos tu solicitud, puedes reclamar ante la{' '}
          <strong>Agencia Espanola de Proteccion de Datos</strong> (
          <a href="https://www.aepd.es" rel="noreferrer noopener" target="_blank">aepd.es</a>
          ).
        </p>
      </section>

      <section>
        <h2>8. Seguridad</h2>
        <p>
          Aplicamos medidas tecnicas y organizativas razonables: TLS 1.2+ obligatorio, contrasenas con hash bcrypt,
          autenticacion JWT con PKCE, Row Level Security en todas las tablas, almacenamiento privado para datos
          sensibles y publico restringido por carpeta/usuario para imagenes, anti-bot CAPTCHA, registros de
          auditoria de errores y politica de contrasenas reforzada (minimo 12 caracteres y 3 clases de complejidad).
        </p>
        <p>
          En caso de quiebra de seguridad que pueda afectar a tus derechos, notificaremos a la AEPD y, cuando
          proceda, a las personas afectadas en los plazos del art. 33 y 34 RGPD.
        </p>
      </section>

      <section>
        <h2>9. Menores</h2>
        <p>
          helpMe NO esta dirigido a menores de 14 anos. Si tienes entre 14 y 17 anos necesitas el consentimiento de
          tus tutores legales para utilizar la aplicacion. Si detectamos cuentas de menores sin consentimiento, las
          eliminaremos.
        </p>
      </section>

      <section>
        <h2>10. Cambios en la politica</h2>
        <p>
          Podemos actualizar esta politica para reflejar cambios legales o funcionales. Te informaremos por correo
          electronico o mediante aviso destacado en la aplicacion al menos 7 dias antes de que entren en vigor
          cambios sustanciales.
        </p>
      </section>

      <section>
        <h2>11. Informacion visible en la plataforma</h2>
        <ul>
          <li>Tu telefono no se mostrara publicamente por defecto.</li>
          <li>La ubicacion puede mostrarse de forma aproximada para facilitar la busqueda de ayuda cercana.</li>
          <li>
            Cuando actives funciones de Stripe, determinados datos de identidad y financieros los gestionara
            Stripe conforme a sus propios procesos y politicas.
          </li>
        </ul>
      </section>
    </LegalLayout>
  )
}
