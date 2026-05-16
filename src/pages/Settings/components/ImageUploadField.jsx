import styles from '../SettingsPage.module.css'

export default function ImageUploadField({
  label,
  helperText,
  currentUrl,
  previewUrl,
  file,
  fallbackInitial,
  onChange,
  variant = 'avatar',
}) {
  const activeUrl = previewUrl || currentUrl
  const previewClassName = variant === 'banner' ? styles.bannerPreview : styles.avatarPreview

  return (
    <label className={`${styles.field} ${styles.uploadField}`}>
      <span>{label}</span>
      <input type="file" accept="image/*" onChange={(event) => onChange(event.target.files?.[0] || null)} />
      <div className={styles.uploadMeta}>
        <p>{file ? file.name : helperText}</p>
      </div>
      <div className={previewClassName}>
        {activeUrl ? (
          <img src={activeUrl} alt={label} />
        ) : (
          <div className={variant === 'banner' ? styles.previewPlaceholder : styles.previewInitial}>
            {variant === 'banner' ? 'Fondo de Home' : (fallbackInitial || 'U')}
          </div>
        )}
      </div>
    </label>
  )
}
