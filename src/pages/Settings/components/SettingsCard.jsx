import SettingsSection from './SettingsSection'

export default function SettingsCard({ id, eyebrow, title, description, children }) {
  return (
    <SettingsSection
      id={id}
      eyebrow={eyebrow}
      title={title}
      description={description}
      actionLabel="Editar"
      onAction={() => {
        const element = document.getElementById(id)
        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }}
    >
      {children}
    </SettingsSection>
  )
}
