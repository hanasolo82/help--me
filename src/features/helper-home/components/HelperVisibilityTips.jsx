import styles from '../styles/helperHome.module.css'

function collectTips(profile, taskCount) {
  const tips = []
  const skillsCount = Array.isArray(profile?.skills)
    ? profile.skills.length
    : Number(profile?.skills_count || profile?.completed_tasks || 0)

  if (profile?.availability_enabled === false) {
    tips.push({
      title: 'Añade disponibilidad',
      body: 'Tu perfil está pausado. Publicar tu horario ayuda a recibir más solicitudes compatibles.',
    })
  }

  if (!Number.isFinite(skillsCount) || skillsCount === 0) {
    tips.push({
      title: 'Completa tus skills',
      body: 'Añadir habilidades aumenta tu compatibilidad y mejora el ranking de tareas cercanas.',
    })
  }

  if (!Number.isFinite(Number(profile?.search_radius_km)) || Number(profile?.search_radius_km) <= 3) {
    tips.push({
      title: 'Amplía tu radio',
      body: 'Un radio algo más amplio puede mostrarte más oportunidades sin perder relevancia.',
    })
  }

  if (taskCount === 0) {
    tips.push({
      title: 'Revisa tu perfil público',
      body: 'Un perfil completo, claro y confiable suele recibir más contacto desde requests cercanas.',
    })
  }

  return tips.slice(0, 3)
}

export default function HelperVisibilityTips({ profile, taskCount = 0 }) {
  const tips = collectTips(profile, taskCount)

  if (tips.length === 0) {
    return null
  }

  return (
    <section className={styles.panel} aria-label="Consejos de visibilidad">
      <div className={styles.panelTitle}>
        <h3>Mejorar visibilidad</h3>
        <p>Pequeños ajustes, más oportunidades.</p>
      </div>

      <div className={styles.tipList}>
        {tips.map((tip) => (
          <article key={tip.title} className={styles.tip}>
            <strong>{tip.title}</strong>
            <p>{tip.body}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
