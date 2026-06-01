import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera } from 'lucide-react'
import Cropper from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import styles from '../SettingsPage.module.css'

const DEFAULT_CROP = { x: 0, y: 0 }
const DEFAULT_ZOOM = 1
const MIN_ZOOM = 1
const MAX_ZOOM = 3

function createImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = source
  })
}

function getOutputMimeType(fileType) {
  if (fileType === 'image/jpeg' || fileType === 'image/jpg') return 'image/jpeg'
  if (fileType === 'image/webp') return 'image/webp'

  return 'image/png'
}

function buildOutputFileName(originalName, mimeType) {
  const baseName = String(originalName || 'avatar').replace(/\.[^.]+$/, '')

  if (mimeType === 'image/jpeg') {
    return `${baseName}.jpg`
  }

  if (mimeType === 'image/webp') {
    return `${baseName}.webp`
  }

  return `${baseName}.png`
}

async function createCroppedImage(source, croppedAreaPixels, originalFile) {
  const image = await createImage(source)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('No pudimos preparar la imagen.')
  }

  const cropSize = Math.max(
    1,
    Math.round((croppedAreaPixels.width + croppedAreaPixels.height) / 2),
  )

  canvas.width = cropSize
  canvas.height = cropSize

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  context.drawImage(
    image,
    Math.round(croppedAreaPixels.x),
    Math.round(croppedAreaPixels.y),
    cropSize,
    cropSize,
    0,
    0,
    cropSize,
    cropSize,
  )

  const mimeType = getOutputMimeType(originalFile.type)
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error('No pudimos generar la imagen recortada.'))
          return
        }

        resolve(result)
      },
      mimeType,
      mimeType === 'image/png' ? undefined : 0.96,
    )
  })

  const fileName = buildOutputFileName(originalFile.name, mimeType)
  return new File([blob], fileName, {
    type: blob.type || mimeType,
    lastModified: Date.now(),
  })
}

function CropModal({
  open,
  source,
  crop,
  zoom,
  cropAreaPixels,
  isImageReady,
  isSaving,
  isDragging,
  error,
  onCancel,
  onConfirm,
  onCropChange,
  onCropComplete,
  onZoomChange,
  onInteractionStart,
  onInteractionEnd,
  onMediaLoaded,
}) {
  const modalId = useId()

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !isSaving) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel, isSaving])

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className={styles.avatarModalBackdrop} onMouseDown={isSaving ? undefined : onCancel}>
      <div
        className={styles.avatarModal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.avatarModalHeader}>
          <button
            type="button"
            className={styles.avatarModalGhostButton}
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancelar
          </button>

          <div className={styles.avatarModalHeading}>
            <p className={styles.avatarModalEyebrow}>Foto de perfil</p>
            <h2 id={modalId}>Editar foto</h2>
          </div>

          <button
            type="button"
            className={styles.avatarModalPrimaryButton}
            onClick={onConfirm}
            disabled={!isImageReady || isSaving || !cropAreaPixels}
          >
            {isSaving ? 'Guardando...' : 'Listo'}
          </button>
        </header>

        <div className={styles.avatarModalBody}>
          <div className={styles.avatarCropStage}>
            <div
              className={[
                styles.avatarCropFrame,
                isSaving ? styles.avatarCropFrameBusy : '',
                !isImageReady ? styles.avatarCropFrameLoading : '',
                isDragging ? styles.avatarCropFrameDragging : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {source ? (
                <Cropper
                  image={source}
                  crop={crop}
                  zoom={zoom}
                  minZoom={MIN_ZOOM}
                  maxZoom={MAX_ZOOM}
                  zoomSpeed={0.15}
                  zoomWithScroll
                  aspect={1}
                  cropShape="round"
                  showGrid
                  restrictPosition
                  objectFit="cover"
                  onCropChange={onCropChange}
                  onCropComplete={onCropComplete}
                  onZoomChange={onZoomChange}
                  onMediaLoaded={onMediaLoaded}
                  onInteractionStart={onInteractionStart}
                  onInteractionEnd={onInteractionEnd}
                />
              ) : null}
            </div>

            <p className={styles.avatarModalInstructions}>Arrastra para centrar la imagen.</p>
          </div>

          {error ? (
            <p className={styles.avatarModalError} role="alert">
              {error}
            </p>
          ) : null}

        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function ImageUploadField({
  label,
  helperText,
  currentUrl,
  previewUrl,
  fallbackInitial,
  onChange,
  actionLabel = 'Editar foto',
  statusTone = null,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const cropStateRef = useRef({ crop: DEFAULT_CROP, zoom: DEFAULT_ZOOM })
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSource, setEditorSource] = useState('')
  const [editorFile, setEditorFile] = useState(null)
  const [crop, setCrop] = useState(DEFAULT_CROP)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [cropAreaPixels, setCropAreaPixels] = useState(null)
  const [isImageReady, setIsImageReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editorError, setEditorError] = useState('')
  const [isDragging, setIsDragging] = useState(false)

  const activeUrl = previewUrl || currentUrl
  const avatarClassName = [
    styles.avatarPreview,
    styles.avatarPreviewCompact,
  ].join(' ')

  useEffect(() => {
    if (!editorSource) return undefined

    return () => URL.revokeObjectURL(editorSource)
  }, [editorSource])

  function closeEditor() {
    setEditorOpen(false)
    setEditorSource('')
    setEditorFile(null)
    setCrop(DEFAULT_CROP)
    setZoom(DEFAULT_ZOOM)
    setCropAreaPixels(null)
    setIsImageReady(false)
    setIsSaving(false)
    setEditorError('')
    setIsDragging(false)
  }

  function openEditor(fileToEdit) {
    const nextSource = URL.createObjectURL(fileToEdit)

    setEditorFile(fileToEdit)
    setEditorSource(nextSource)
    setCrop(cropStateRef.current.crop || DEFAULT_CROP)
    setZoom(cropStateRef.current.zoom || DEFAULT_ZOOM)
    setCropAreaPixels(null)
    setIsImageReady(false)
    setIsSaving(false)
    setEditorError('')
    setIsDragging(false)
    setEditorOpen(true)
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0] || null
    event.target.value = ''

    if (!selectedFile) return

    if (!selectedFile.type.startsWith('image/')) {
      setEditorError('Selecciona una imagen compatible.')
      return
    }

    openEditor(selectedFile)
  }

  async function handleConfirm() {
    if (!editorSource || !editorFile || !cropAreaPixels) return

    setIsSaving(true)
    setEditorError('')

    try {
      const croppedFile = await createCroppedImage(editorSource, cropAreaPixels, editorFile)
      cropStateRef.current = { crop, zoom }
      onChange(croppedFile)
      closeEditor()
    } catch (error) {
      setEditorError(error?.message || 'No pudimos guardar la imagen recortada.')
      setIsSaving(false)
    }
  }

  return (
    <div className={`${styles.field} ${styles.uploadField}`}>
      <span>{label}</span>
      <input
        ref={inputRef}
        id={inputId}
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className={styles.avatarEditor}>
        <div className={avatarClassName}>
          {activeUrl ? (
            <img src={activeUrl} alt={label} draggable="false" />
          ) : (
            <div className={styles.previewInitial}>{fallbackInitial || 'U'}</div>
          )}

          {statusTone ? (
            <span
              className={
                statusTone === 'available'
                  ? styles.avatarStatusAvailable
                  : styles.avatarStatusUnavailable
              }
              aria-hidden="true"
            />
          ) : null}

          <button
            type="button"
            className={`${styles.compactSecondaryAction} ${styles.avatarActionButton}`}
            onClick={() => inputRef.current?.click()}
            aria-label={actionLabel}
            title={actionLabel}
          >
            <Camera size={14} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.avatarEditorContent}>
          <div className={styles.uploadControls}>
            <p>{helperText}</p>
          </div>
        </div>
      </div>

      <CropModal
        open={editorOpen}
        source={editorSource}
        crop={crop}
        zoom={zoom}
        cropAreaPixels={cropAreaPixels}
        isImageReady={isImageReady}
        isSaving={isSaving}
        isDragging={isDragging}
        error={editorError}
        onCancel={closeEditor}
        onConfirm={handleConfirm}
        onCropChange={setCrop}
        onCropComplete={(_, pixels) => setCropAreaPixels(pixels)}
        onZoomChange={setZoom}
        onInteractionStart={() => setIsDragging(true)}
        onInteractionEnd={() => setIsDragging(false)}
        onMediaLoaded={() => setIsImageReady(true)}
      />
    </div>
  )
}
