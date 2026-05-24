import LegalLayout from './LegalLayout'

// TODO: sustituir por una versión revisada por asesoría legal cuando cierre el texto definitivo de comunidad.
export default function CommunityGuidelines() {
  return (
    <LegalLayout title="Normas de la comunidad" lastUpdated="2026-05-24">
      <section>
        <h2>1. Uso respetuoso</h2>
        <p>
          Trata a otras personas con cortesía, evita insultos, amenazas o conductas hostiles y mantén un tono
          profesional en tus conversaciones y solicitudes.
        </p>
      </section>

      <section>
        <h2>2. Tareas seguras</h2>
        <p>
          Acepta solo tareas que puedas realizar con seguridad, sin poner en riesgo tu integridad ni la de otros
          usuarios. Si una solicitud no encaja con tus capacidades, declínala sin demora.
        </p>
      </section>

      <section>
        <h2>3. Comunicación clara</h2>
        <p>
          Confirma los detalles relevantes antes de acudir, avisa si cambian tus planes y mantén una comunicación
          clara durante todo el proceso.
        </p>
      </section>

      <section>
        <h2>4. Privacidad</h2>
        <p>
          No compartas datos sensibles fuera de HelpMe, evita publicar información innecesaria y respeta la
          privacidad de otras personas.
        </p>
      </section>

      <section>
        <h2>5. Moderación y cumplimiento</h2>
        <p>
          HelpMe puede revisar, limitar o retirar perfiles y contenidos cuando existan incumplimientos, riesgos
          para la comunidad o usos contrarios a estas normas.
        </p>
      </section>
    </LegalLayout>
  )
}
