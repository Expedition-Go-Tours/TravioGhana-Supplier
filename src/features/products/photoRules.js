/**
 * The photo rules the uploader has always *promised* in its "Do" list but
 * never enforced.
 *
 * A tile on the storefront is 366px wide on a phone (≈1100px at 3×) and the
 * desktop gallery hero column is ~816px (≈1630px at 2×). That is where the
 * numbers come from: 1280 is the mobile floor, 2048 is what keeps the desktop
 * hero sharp. Both GetYourGuide and Viator gate uploads on the same basis.
 */

export const MIN_PHOTO_WIDTH = 1280
export const IDEAL_PHOTO_WIDTH = 2048
export const MAX_PHOTO_BYTES = 7 * 1024 * 1024
export const MIN_PHOTOS = 5

/** Read an image's natural size without touching the DOM tree. */
export function readPhotoSize(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
      .then((bitmap) => {
        const size = { width: bitmap.width, height: bitmap.height }
        bitmap.close?.()
        return size
      })
      .catch(() => readPhotoSizeWithElement(file))
  }
  return readPhotoSizeWithElement(file)
}

function readPhotoSizeWithElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const size = { width: img.naturalWidth, height: img.naturalHeight }
      URL.revokeObjectURL(url)
      resolve(size)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read this image'))
    }
    img.src = url
  })
}

/**
 * Decide whether a file may be uploaded.
 *
 * Rejections carry a reason the supplier can act on. `lowRes` is a warning, not
 * a rejection: a 1280px photo is perfectly usable on a phone, it just softens
 * on a large screen.
 */
export async function checkPhoto(file) {
  let size
  try {
    size = await readPhotoSize(file)
  } catch {
    return { ok: false, width: 0, height: 0, reason: 'This file could not be read as an image.' }
  }

  const { width, height } = size

  if (height > width) {
    return {
      ok: false,
      width,
      height,
      reason: `Portrait isn't supported (${width}×${height}). Use a landscape photo.`,
    }
  }

  if (width < MIN_PHOTO_WIDTH) {
    return {
      ok: false,
      width,
      height,
      reason: `Too small (${width}×${height}). Use a photo at least ${MIN_PHOTO_WIDTH}px wide.`,
    }
  }

  return { ok: true, width, height, lowRes: width < IDEAL_PHOTO_WIDTH }
}

/** The message for a file the dropzone itself refused (size or type). */
export function rejectionMessage(fileRejection) {
  const name = fileRejection?.file?.name || 'That file'
  const codes = (fileRejection?.errors || []).map((e) => e.code)
  if (codes.includes('file-too-large')) {
    return `${name} is larger than 7MB.`
  }
  if (codes.includes('file-invalid-type')) {
    return `${name} isn't a supported image. Use JPG, PNG, WebP or AVIF.`
  }
  return `${name} couldn't be added.`
}
