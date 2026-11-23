import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkPhoto, rejectionMessage, MIN_PHOTO_WIDTH, IDEAL_PHOTO_WIDTH } from '../photoRules'

function stubBitmap(width, height) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn().mockResolvedValue({ width, height, close: vi.fn() }),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('checkPhoto', () => {
  it('accepts a sharp landscape photo', async () => {
    stubBitmap(2048, 1536)
    const verdict = await checkPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    expect(verdict.ok).toBe(true)
    expect(verdict.width).toBe(2048)
    expect(verdict.lowRes).toBe(false)
  })

  it('accepts a landscape photo at the floor but flags it as soft', async () => {
    stubBitmap(MIN_PHOTO_WIDTH, 960)
    const verdict = await checkPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    expect(verdict.ok).toBe(true)
    expect(verdict.lowRes).toBe(true)
  })

  it('rejects a portrait photo before it is uploaded', async () => {
    stubBitmap(645, 799)
    const verdict = await checkPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/portrait/i)
    expect(verdict.reason).toContain('645×799')
  })

  it('rejects a landscape photo narrower than the floor', async () => {
    stubBitmap(1210, 680)
    const verdict = await checkPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/too small/i)
    expect(verdict.reason).toContain(String(MIN_PHOTO_WIDTH))
  })

  it('rejects a square photo below the floor', async () => {
    stubBitmap(755, 755)
    const verdict = await checkPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))

    expect(verdict.ok).toBe(false)
  })

  it('rejects a file it cannot decode instead of uploading it blindly', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad file')))
    // jsdom never loads <img>, so drive the fallback straight to onerror.
    class BrokenImage {
      set src(_value) {
        queueMicrotask(() => this.onerror?.(new Error('bad file')))
      }
    }
    vi.stubGlobal('Image', BrokenImage)
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: () => 'blob:broken',
      revokeObjectURL: () => {},
    })

    const verdict = await checkPhoto(new File(['x'], 'broken.jpg', { type: 'image/jpeg' }))

    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toMatch(/could not be read/i)
  })

  it('uses the ideal width as the low-res boundary', async () => {
    stubBitmap(IDEAL_PHOTO_WIDTH - 1, 1000)
    const below = await checkPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(below.lowRes).toBe(true)

    stubBitmap(IDEAL_PHOTO_WIDTH, 1000)
    const at = await checkPhoto(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(at.lowRes).toBe(false)
  })
})

describe('rejectionMessage', () => {
  it('names the file and the reason for files the dropzone refused', () => {
    expect(
      rejectionMessage({
        file: { name: 'huge.jpg' },
        errors: [{ code: 'file-too-large' }],
      }),
    ).toBe('huge.jpg is larger than 7MB.')

    expect(
      rejectionMessage({
        file: { name: 'notes.pdf' },
        errors: [{ code: 'file-invalid-type' }],
      }),
    ).toMatch(/isn't a supported image/)
  })

  it('falls back to a generic message', () => {
    expect(rejectionMessage({ file: { name: 'x.jpg' }, errors: [] })).toBe("x.jpg couldn't be added.")
  })
})
