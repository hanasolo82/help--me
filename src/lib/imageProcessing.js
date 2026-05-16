const ACCEPTED_INPUT_RE = /^image\//
const MAX_INPUT_BYTES = 20 * 1024 * 1024

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve(img)
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen.'))
    }
    img.src = url
  })
}

function blobToWebpFile(blob, originalName) {
  const baseName = (originalName || 'imagen').replace(/\.[^.]+$/, '') || 'imagen'
  return new File([blob], `${baseName}.webp`, { type: 'image/webp' })
}

export function isImageFile(file) {
  return Boolean(file && ACCEPTED_INPUT_RE.test(file.type))
}

// Acepta jpg, png, webp, gif, heic... y devuelve siempre un File webp redimensionado.
export async function convertImageToWebp(file, { maxDimension = 1600, quality = 0.85 } = {}) {
  if (!isImageFile(file)) {
    throw new Error('Solo se admiten archivos de imagen.')
  }

  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('La imagen pesa demasiado. Usa una de menos de 20 MB.')
  }

  const img = await loadImageFromFile(file)
  const scale = Math.min(1, maxDimension / Math.max(img.width, img.height))
  const targetWidth = Math.max(1, Math.round(img.width * scale))
  const targetHeight = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = targetWidth
  canvas.height = targetHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Tu navegador no soporta canvas para procesar imagenes.')
  }
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight)

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('No se pudo convertir la imagen a WebP.'))),
      'image/webp',
      quality,
    )
  })

  return blobToWebpFile(blob, file.name)
}
