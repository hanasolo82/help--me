import ProfileContentSection from '../ProfileContentSection'
import styles from '../../styles/profilePublicView.module.css'
import { getProfileName } from '../../utils/profileFormatters'

// Cierre del recorrido single-page para visitantes: tras evaluar disponibilidad,
// habilidades, confianza y opiniones, el CTA de contacto queda al final del
// flujo (además de la barra sticky de móvil).
export default function ProfileContactPanel({
  profile,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
  onToggleFavorite,
  favoriteState,
  favoriteLabel,
  isFavoriteLoading,
}) {
  const displayName = getProfileName(profile)

  return (
    <ProfileContentSection
      id="contacto"
      eyebrow="Contacto"
      title={`¿Te encaja ${displayName}?`}
      lead={
        showPrimaryAction
          ? 'Cuéntale qué necesitas: recibirá tu solicitud directa y podrá aceptarla al momento.'
          : 'Guárdalo en favoritos para tenerlo a mano cuando publiques una solicitud.'
      }
    >
      <div className={styles.contactActions}>
        {showPrimaryAction ? (
          <button type="button" className="primary-action" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        ) : null}
        <button
          type="button"
          className="secondary-action"
          onClick={onToggleFavorite}
          disabled={isFavoriteLoading}
        >
          {favoriteState?.isFavorite ? 'Quitar favorito' : favoriteLabel}
        </button>
      </div>
    </ProfileContentSection>
  )
}
