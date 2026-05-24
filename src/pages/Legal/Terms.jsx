import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'

// Terminos y condiciones reales para una plataforma de micro-ayuda entre vecinos en Espana.
// helpMe es intermediario; no presta los servicios ni interviene en el pago entre particulares.
export default function Terms() {
  return (
    <LegalLayout title="Terminos y condiciones de uso" lastUpdated="2026-05-13">
      <section>
        <h2>1. Identificacion del prestador</h2>
        <p>
          En cumplimiento del art. 10 de la LSSI-CE, el titular de la aplicacion helpMe (en adelante, la
          "Plataforma") es <strong>[NOMBRE Y APELLIDOS]</strong>, persona fisica con NIF/NIE{' '}
          <strong>[NIF_O_NIE]</strong>, domicilio en <strong>[DIRECCION POSTAL]</strong> y correo electronico de
          contacto{' '}
          <a href="mailto:[CORREO_DE_CONTACTO_DEL_RESPONSABLE]">[CORREO_DE_CONTACTO_DEL_RESPONSABLE]</a>.
        </p>
      </section>

      <section>
        <h2>2. Objeto</h2>
        <p>
          helpMe es una plataforma tecnologica que pone en contacto a vecinos que necesitan ayuda con tareas
          cotidianas (mascotas, recados, compras, ayuda tecnica) con otros vecinos dispuestos a realizarlas a cambio
          de un precio pactado. <strong>helpMe NO presta los servicios anunciados</strong>; actua exclusivamente
          como intermediario tecnologico entre usuarios mayores de edad.
        </p>
      </section>

      <section>
        <h2>3. Aceptacion y modificaciones</h2>
        <p>
          Al registrarte aceptas estos Terminos, la <Link to="/legal/privacy">Politica de privacidad</Link> y la{' '}
          <Link to="/legal/cookies">Politica de cookies</Link>. Podemos modificar los Terminos por motivos legales,
          tecnicos o comerciales. Te avisaremos por correo o aviso destacado al menos <strong>7 dias antes</strong>{' '}
          de la entrada en vigor; si no estas de acuerdo puedes cancelar tu cuenta gratuitamente.
        </p>
      </section>

      <section>
        <h2>4. Requisitos para usar la Plataforma</h2>
        <ul>
          <li>Ser mayor de 14 anos. Entre 14 y 17 anos necesitas consentimiento de tus tutores legales.</li>
          <li>Tener capacidad legal para contratar la realizacion de la tarea anunciada.</li>
          <li>Residir o encontrarte de forma habitual en la zona geografica cubierta por la Plataforma.</li>
          <li>Facilitar datos veraces, exactos y actualizados en tu profile.</li>
        </ul>
      </section>

      <section>
        <h2>5. Cuenta y seguridad</h2>
        <p>
          Eres responsable de la confidencialidad de tus credenciales y de toda actividad realizada bajo tu cuenta.
          Debes notificarnos inmediatamente cualquier uso no autorizado. helpMe no almacena tu contrasena en claro;
          se conserva con hash criptografico bcrypt mediante Supabase.
        </p>
      </section>

      <section>
        <h2>6. Reglas de uso</h2>
        <p>Esta prohibido y motivo de suspension de la cuenta:</p>
        <ul>
          <li>Publicar tareas ilicitas, peligrosas, sanitarias, sexuales, de cuidado de menores no acompanados,
            transporte de personas, manipulacion de alimentos sin garantias, o cualquier actividad que requiera
            titulacion o licencia oficial.</li>
          <li>Suplantar identidad, crear perfiles falsos o gestionar mas de una cuenta por persona.</li>
          <li>Compartir contenido que infrinja derechos de propiedad intelectual o industrial.</li>
          <li>Publicar imagenes que muestren a terceros identificables sin su consentimiento.</li>
          <li>Usar la Plataforma para enviar spam, ofertas comerciales no relacionadas con la tarea, criptoestafas
            o esquemas piramidales.</li>
          <li>Acordar pagos en efectivo cuando exista obligacion legal de declarar la operacion fuera de la
            Plataforma (cuando se implante el modulo de pagos, sera obligatorio usarlo).</li>
          <li>Eludir las medidas de seguridad (CAPTCHA, RLS, limites de uso).</li>
        </ul>
      </section>

      <section>
        <h2>7. Naturaleza de la relacion entre usuarios</h2>
        <p>
          HelpMe actua como plataforma tecnologica de intermediacion entre personas que solicitan ayuda y usuarios
          que ofrecen asistencia independiente. HelpMe no presta directamente los servicios publicados en la
          plataforma ni interviene en la ejecucion material de los acuerdos alcanzados entre usuarios.
        </p>
        <p>
          Las tareas que se acuerdan a traves de helpMe se realizan a titulo personal entre vecinos. Cuando una
          tarea constituya una <strong>actividad economica</strong> en los terminos del art. 5 LIRPF o del art. 4
          LIVA, sera responsabilidad exclusiva del usuario que la realice declarar los ingresos obtenidos y cumplir
          con sus obligaciones fiscales (IRPF, IVA, alta en RETA, etc.).
        </p>
        <p>
          helpMe NO es empleador ni intermediario laboral, no descuenta cotizaciones a la Seguridad Social y no
          asume responsabilidad por la calidad, seguridad o legalidad de los servicios prestados entre usuarios.
        </p>
      </section>

      <section>
        <h2>8. Precios, comisiones y pagos</h2>
        <p>
          Durante la fase MVP actual, el precio mostrado en cada tarea es <strong>indicativo</strong> y el pago se
          realiza directamente entre los usuarios fuera de la Plataforma. helpMe no cobra comision en esta fase.
        </p>
        <p>
          Cuando se active el modulo de pagos integrado (previsto via Stripe Connect), se mostrara con claridad: el
          importe que cobra el helper, la comision de la Plataforma, los impuestos repercutibles y el momento de
          liberacion del dinero retenido en garantia (escrow). Se publicara un addendum a estos Terminos que sera
          notificado con la antelacion del apartado 3.
        </p>
      </section>

      <section>
        <h2>9. Valoraciones y reputacion</h2>
        <p>
          Las valoraciones (1-5 estrellas y comentario opcional) son responsabilidad del usuario que las emite. Solo
          puede valorar al ayudante el solicitante cuyo Task este en estado <code>completed</code>. La Plataforma
          puede retirar valoraciones que contengan insultos, datos personales de terceros, discurso de odio o
          contenido manifiestamente falso.
        </p>
      </section>

      <section>
        <h2>10. Contenido subido por los usuarios</h2>
        <p>
          Conservas la titularidad del contenido (textos, imagenes) que subes a helpMe. Al publicarlo nos otorgas
          una licencia limitada, no exclusiva y revocable para almacenarlo, mostrarlo dentro de la Plataforma a
          otros usuarios autorizados y procesarlo tecnicamente para la prestacion del servicio.
        </p>
        <p>
          Si consideras que algun contenido vulnera tus derechos puedes notificarlo a{' '}
          <a href="mailto:[CORREO_DE_CONTACTO_DEL_RESPONSABLE]">[CORREO_DE_CONTACTO_DEL_RESPONSABLE]</a> indicando
          enlace o id del contenido y la base de tu reclamacion. Lo revisaremos en un plazo razonable y, en caso
          procedente, lo retiraremos.
        </p>
      </section>

      <section>
        <h2>11. Disponibilidad y soporte</h2>
        <p>
          helpMe se presta "tal cual" sin garantia de disponibilidad continua. Podemos suspender el servicio por
          mantenimiento o causas de fuerza mayor. Hacemos esfuerzos razonables para minimizar la interrupcion y
          comunicar incidencias relevantes.
        </p>
      </section>

      <section>
        <h2>12. Limitacion de responsabilidad</h2>
        <p>
          En la maxima medida permitida por la ley, helpMe no sera responsable de:
        </p>
        <ul>
          <li>Los danos derivados de la realizacion o no realizacion de la tarea acordada entre usuarios.</li>
          <li>El incumplimiento de pago entre usuarios mientras no se integre el modulo de pagos.</li>
          <li>El uso indebido de la Plataforma o el incumplimiento de estos Terminos por otros usuarios.</li>
          <li>Perdidas indirectas, lucro cesante o danos morales no expresamente reconocidos por ley imperativa.</li>
        </ul>
        <p>
          Nada en estos Terminos limita la responsabilidad por dolo, negligencia grave, danos personales o derechos
          de consumidores y usuarios que sean irrenunciables conforme al RDLeg 1/2007.
        </p>
      </section>

      <section>
        <h2>13. Suspension y baja</h2>
        <p>
          Puedes darte de baja en cualquier momento desde tu perfil. Podemos suspender o cancelar cuentas que
          incumplan estos Terminos, previa notificacion salvo casos urgentes (fraude, seguridad). Conservaremos
          datos minimos durante los plazos del apartado 6 de la Politica de privacidad por motivos legales.
        </p>
      </section>

      <section>
        <h2>14. Resolucion de conflictos</h2>
        <p>
          Antes de acudir a la via judicial, intenta resolver tu reclamacion contactando con nosotros en{' '}
          <a href="mailto:[CORREO_DE_CONTACTO_DEL_RESPONSABLE]">[CORREO_DE_CONTACTO_DEL_RESPONSABLE]</a>. Si eres
          consumidor, puedes acudir a la plataforma de resolucion de litigios en linea de la Comision Europea:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr"
            rel="noreferrer noopener"
            target="_blank"
          >
            ec.europa.eu/consumers/odr
          </a>
          .
        </p>
        <p>
          Ley aplicable: legislacion espanola. Si la normativa imperativa de proteccion al consumidor te otorga un
          fuero propio, se respetara; en otro caso, las partes se someten a los Juzgados y Tribunales del domicilio
          del responsable indicado en el apartado 1.
        </p>
      </section>
    </LegalLayout>
  )
}
