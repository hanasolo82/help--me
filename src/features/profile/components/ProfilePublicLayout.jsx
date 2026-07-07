import { useRef, useState } from 'react'
import styles from '../styles/profilePublicView.module.css'
import ProfileSidebar from './ProfileSidebar'
import ProfileMain from './ProfileMain'
import ProfileActionBar from './ProfileActionBar'
import ProfileSectionTabs from './ProfileSectionTabs'

function getInitialSectionIndex(sections) {
  if (typeof window === 'undefined') return 0

  const hash = window.location.hash.replace('#', '')
  const hashIndex = sections.findIndex((section) => section.id === hash)
  return hashIndex >= 0 ? hashIndex : 0
}

// Navegación real por secciones: se renderiza SOLO la sección activa y el
// contador "Sección X de N" siempre refleja lo que hay en pantalla.
export default function ProfilePublicLayout({
  profile,
  reviews,
  skills,
  filteredSkills,
  verifications,
  availability,
  sections,
  activeSkillId,
  onSkillChange,
  isOwnProfile,
  onEditProfile,
  onBack,
  onPrimaryAction,
  primaryActionLabel,
  showPrimaryAction,
  onToggleFavorite,
  favoriteState,
  favoriteLabel,
  isFavoriteLoading,
  helperAvailable,
}) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(() => getInitialSectionIndex(sections))
  const layoutRef = useRef(null)

  const safeIndex = Math.min(Math.max(activeSectionIndex, 0), Math.max(sections.length - 1, 0))
  const activeSectionId = sections[safeIndex]?.id || sections[0]?.id || null

  function handleNavigate(nextIndex) {
    if (nextIndex < 0 || nextIndex > sections.length - 1) return

    setActiveSectionIndex(nextIndex)
    window.history.replaceState(window.history.state, '', `#${sections[nextIndex].id}`)
    layoutRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>
      <div className={styles.profileNavigation}>
        <button type="button" className={`icon-button ${styles.backButton}`} onClick={onBack} aria-label="Volver">
          ←
        </button>
        <ProfileSectionTabs sections={sections} activeIndex={safeIndex} onNavigate={handleNavigate} />
      </div>

      <div className={styles.layout} ref={layoutRef}>
        <ProfileSidebar
          profile={profile}
          isOwnProfile={isOwnProfile}
          onEditProfile={onEditProfile}
          onPrimaryAction={onPrimaryAction}
          primaryActionLabel={primaryActionLabel}
          showPrimaryAction={showPrimaryAction}
          onToggleFavorite={onToggleFavorite}
          favoriteLabel={favoriteLabel}
          isFavoriteLoading={isFavoriteLoading}
          favoriteState={favoriteState}
          helperAvailable={helperAvailable}
        />

        <ProfileMain
          profile={profile}
          reviews={reviews}
          skills={skills}
          filteredSkills={filteredSkills}
          verifications={verifications}
          availability={availability}
          activeSkillId={activeSkillId}
          onSkillChange={onSkillChange}
          activeSectionId={activeSectionId}
        />
      </div>

      <ProfileActionBar
        isOwnProfile={isOwnProfile}
        onPrimaryAction={onPrimaryAction}
        primaryActionLabel={primaryActionLabel}
        showPrimaryAction={showPrimaryAction}
        onToggleFavorite={onToggleFavorite}
        favoriteLabel={favoriteLabel}
        favoriteState={favoriteState}
        isFavoriteLoading={isFavoriteLoading}
      />
    </div>
  )
}
