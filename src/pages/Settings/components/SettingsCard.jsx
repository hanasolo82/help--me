import SettingsSection from './SettingsSection'

export default function SettingsCard({ id, eyebrow, title, description, children, actionLabel, onAction }) {
  return (
    <SettingsSection
      id={id}
      eyebrow={eyebrow}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
    >
      {children}
    </SettingsSection>
  )
}
