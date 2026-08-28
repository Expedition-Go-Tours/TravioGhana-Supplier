import { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { HelpCircle, Upload, Image, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Check, X, Trash2 } from 'lucide-react'
import { useProductBuilderStore } from '@/features/products/productBuilderStore'
import { useStepErrors } from '@/features/products/useStepErrors'
import { uploadPhotos } from '@/features/products/api'
import { safeId } from '@/lib/utils'
import { transformImage } from '@/lib/image'

const MIN_PHOTOS = 5

export default function Step10Photos() {
  const photos = useProductBuilderStore((s) => s.photos)
  const pendingFiles = useProductBuilderStore((s) => s._pendingFiles)
  const coverPhoto = useProductBuilderStore((s) => s.coverPhoto)
  const copyrightConfirmed = useProductBuilderStore((s) => s.copyrightConfirmed)
  const addPhoto = useProductBuilderStore((s) => s.addPhoto)
  const removePhoto = useProductBuilderStore((s) => s.removePhoto)
  const reorderPhotos = useProductBuilderStore((s) => s.reorderPhotos)
  const setPhotoUrl = useProductBuilderStore((s) => s.setPhotoUrl)
  const setCoverPhoto = useProductBuilderStore((s) => s.setCoverPhoto)
  const trackUploadedUrl = useProductBuilderStore((s) => s.trackUploadedUrl)
  const setField = useProductBuilderStore((s) => s.setField)
  const errors = useStepErrors(11)

  const [uploading, setUploading] = useState(new Set())
  const [uploadErrors, setUploadErrors] = useState({})
  const [tipsOpen, setTipsOpen] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const dragIndex = useRef(null)
  const blobUrls = useRef({})

  useEffect(() => {
    const urls = blobUrls.current;
    return () => {
      Object.values(urls).forEach(URL.revokeObjectURL)
    }
  }, [])

  const getPreviewUrl = useCallback(
    (photo) => {
      if (photo.url) return transformImage(photo.url)
      const file = pendingFiles[photo.id]
      if (!file) return null
      if (!blobUrls.current[photo.id]) {
        blobUrls.current[photo.id] = URL.createObjectURL(file)
      }
      return blobUrls.current[photo.id]
    },
    [pendingFiles],
  )

  const uploadFile = useCallback(async (id, file) => {
    setUploading((prev) => new Set(prev).add(id))
    setUploadErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
    try {
      const formData = new FormData()
      formData.append('photos', file)
      const res = await uploadPhotos(formData)
      const urls = res.data?.data?.photos || []
      if (urls.length > 0) {
        setPhotoUrl(id, urls[0])
        trackUploadedUrl(urls[0])
        if (!coverPhoto) setCoverPhoto(urls[0])
      }
    } catch (err) {
      setUploadErrors((prev) => ({ ...prev, [id]: err.response?.data?.message || 'Upload failed' }))
    } finally {
      setUploading((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
    }
  }, [setPhotoUrl, trackUploadedUrl, setCoverPhoto, coverPhoto])

  const onDrop = useCallback(
    (acceptedFiles) => {
      for (const file of acceptedFiles) {
        const id = safeId()
        addPhoto(id, file)
        uploadFile(id, file)
      }
    },
    [addPhoto, uploadFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'], 'image/avif': ['.avif'] },
    maxSize: 7 * 1024 * 1024,
  })

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const deselectAll = () => setSelectedIds(new Set())

  const deleteSelected = () => {
    const toRemove = photos.filter((p) => selectedIds.has(p.id))
    toRemove.forEach((photo) => {
      if (blobUrls.current[photo.id]) {
        URL.revokeObjectURL(blobUrls.current[photo.id])
        delete blobUrls.current[photo.id]
      }
      if (photo.url && coverPhoto === photo.url) {
        setCoverPhoto('')
      }
    })
    const idsToRemove = selectedIds
    const newPhotos = photos.filter((p) => !idsToRemove.has(p.id))
    newPhotos.forEach((_, i) => {
      const oldIdx = photos.findIndex((p) => p.id === newPhotos[i].id)
      if (oldIdx !== i) removePhoto(oldIdx)
    })
    for (let i = photos.length - 1; i >= 0; i--) {
      if (idsToRemove.has(photos[i].id)) removePhoto(i)
    }
    setSelectedIds(new Set())
  }

  const getSelectedIndex = () => {
    const idx = photos.findIndex((p) => selectedIds.has(p.id))
    return idx
  }

  const movePhoto = (from, to) => {
    if (to < 0 || to >= photos.length) return
    reorderPhotos(from, to)
  }

  const moveSelectedLeft = () => {
    const idx = getSelectedIndex()
    if (idx > 0) movePhoto(idx, idx - 1)
  }

  const moveSelectedRight = () => {
    const idx = getSelectedIndex()
    if (idx >= 0 && idx < photos.length - 1) movePhoto(idx, idx + 1)
  }

  const moveSelectedToFirst = () => {
    const idx = getSelectedIndex()
    if (idx > 0) movePhoto(idx, 0)
  }

  const moveSelectedToLast = () => {
    const idx = getSelectedIndex()
    if (idx >= 0 && idx < photos.length - 1) movePhoto(idx, photos.length - 1)
  }

  const handleRemove = (index) => {
    const photo = photos[index]
    if (blobUrls.current[photo.id]) {
      URL.revokeObjectURL(blobUrls.current[photo.id])
      delete blobUrls.current[photo.id]
    }
    if (photo.url && coverPhoto === photo.url) {
      setCoverPhoto('')
    }
    setSelectedIds((prev) => { const n = new Set(prev); n.delete(photo.id); return n })
    removePhoto(index)
  }

  const hasSelection = selectedIds.size > 0
  const emptySlots = Math.max(0, MIN_PHOTOS - photos.length)

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-5">
          <h2 className="text-lg font-bold text-slate-900">Product Photos</h2>
          <HelpCircle className="w-5 h-5 text-slate-400" />
        </div>

        {/* Selection toolbar */}
        {hasSelection && (
          <div className="flex items-center justify-between p-3 mb-4 bg-white border border-slate-200 rounded-xl">
            <button
              type="button"
              onClick={deselectAll}
              className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Deselect
            </button>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={moveSelectedToFirst}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Move to first"
              >
                <ChevronLeft className="w-4 h-4" />
                <ChevronLeft className="w-4 h-4 -ml-2" />
              </button>
              <button
                type="button"
                onClick={moveSelectedLeft}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Move left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={moveSelectedRight}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Move right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={moveSelectedToLast}
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                title="Move to last"
              >
                <ChevronRight className="w-4 h-4" />
                <ChevronRight className="w-4 h-4 -ml-2" />
              </button>
            </div>

            <button
              type="button"
              onClick={deleteSelected}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}

        {/* Upload area */}
        <div
          {...getRootProps()}
          className={`border border-slate-200 rounded-xl p-6 text-center cursor-pointer transition-all bg-white hover:border-emerald-400 ${
            isDragActive ? 'border-emerald-500 bg-emerald-50' : ''
          }`}
          data-field="photos"
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-center gap-3 mb-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload photos
            </button>
            <span className="text-sm text-slate-500">or drag photos here</span>
          </div>
          <p className="text-xs text-slate-400">
            JPG, JPEG, PNG &bull; Max 7MB each &bull; Minimum {MIN_PHOTOS} photos
          </p>
        </div>

        {/* Hint text */}
        {photos.length > 0 && !hasSelection && (
          <p className="text-xs text-slate-400 text-center mt-3">Drag to reorder &bull; Click to select</p>
        )}

        {errors.photos && <span className="text-[13px] text-red-600 font-medium mt-2 flex items-center gap-1">{errors.photos[0]}</span>}

        {/* Photo grid */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {photos.map((photo, i) => {
            const src = getPreviewUrl(photo)
            const isUploaded = !!photo.url
            const isCover = isUploaded && coverPhoto === photo.url
            const isUploading = uploading.has(photo.id)
            const error = uploadErrors[photo.id]
            const isPending = !isUploaded && !isUploading && !error && !!pendingFiles[photo.id]
            const isSelected = selectedIds.has(photo.id)

            return (
              <div
                key={photo.id}
                className={`group relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : isCover
                      ? 'border-emerald-500 ring-2 ring-emerald-500/30'
                      : 'border-slate-200 hover:border-slate-300'
                } ${isUploading || isPending ? 'opacity-80' : ''} ${error ? 'border-red-400' : ''}`}
                draggable={!isUploading && !hasSelection}
                onDragStart={() => { dragIndex.current = i }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex.current !== null && dragIndex.current !== i) {
                    reorderPhotos(dragIndex.current, i)
                    dragIndex.current = null
                  }
                }}
                onClick={() => toggleSelect(photo.id)}
              >
                {/* Checkbox */}
                <div className={`absolute top-2 left-2 z-20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/90 border-slate-300'
                  }`}>
                    {isSelected && (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    )}
                  </div>
                </div>

                {src ? (
                  <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 grid place-items-center text-slate-400">
                    <Image className="w-8 h-8" />
                  </div>
                )}

                {i === 0 && (
                  <span className="absolute bottom-2 left-2 bg-white/90 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-md z-10">
                    Main photo
                  </span>
                )}

                <button
                  className="absolute top-2 right-2 w-7 h-7 rounded-full border-0 bg-black/50 text-white cursor-pointer grid place-items-center text-xs hover:bg-black/70 transition-colors z-20"
                  onClick={(e) => { e.stopPropagation(); handleRemove(i) }}
                  type="button"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {isUploading && (
                  <div className="absolute inset-0 bg-black/30 grid place-items-center">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}

                {error && (
                  <div className="absolute inset-0 bg-red-500/20 grid place-items-center">
                    <button
                      className="text-white text-xs font-semibold bg-red-600 px-3 py-1.5 rounded-lg border-0 cursor-pointer hover:bg-red-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        const file = pendingFiles[photo.id]
                        if (file) uploadFile(photo.id, file)
                      }}
                      type="button"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {isPending && (
                  <div className="absolute inset-0 bg-black/20 grid place-items-center pointer-events-none">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
            )
          })}

          {Array.from({ length: emptySlots }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 grid place-items-center"
            >
              <Image className="w-8 h-8 text-slate-300" />
            </div>
          ))}
        </div>

        {/* Copyright confirmation */}
        <label className="flex items-start gap-3 cursor-pointer mt-6">
          <input
            type="checkbox"
            checked={copyrightConfirmed}
            onChange={(e) => setField('copyrightConfirmed', e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            data-field="copyrightConfirmed"
          />
          <span className="text-sm text-slate-600 leading-relaxed">
            I confirm that I own the copyright for these pictures and have obtained model release forms for any recognizable faces depicted. I affirm that I have not used any trademarks, logos, or imagery from third parties without proper authorization. I understand that I am liable for any copyright or trademark infringement. For more information, please visit our{' '}
            <a href="#" className="text-emerald-600 underline hover:text-emerald-700">terms and conditions</a>.
          </span>
        </label>
        {errors.copyrightConfirmed && <span className="text-[13px] text-red-600 font-medium mt-1 flex items-center gap-1">{errors.copyrightConfirmed[0]}</span>}
      </div>

      {/* Sidebar */}
      <div className="w-[280px] shrink-0">
        <div className="sticky top-4 space-y-5">
          {/* Tips & requirements */}
          <div>
            <button
              type="button"
              onClick={() => setTipsOpen(!tipsOpen)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-base font-bold text-slate-900">Tips & requirements</h3>
              {tipsOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {tipsOpen && (
              <div className="mt-3 space-y-4">
                <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                  <li>Choose bright and colorful photos that show what the activity is about. The more the better.</li>
                  <li>Put the best one first because it's shown in search results too.</li>
                  <li>Use realistic photos to help manage expectations about crowds, group sizes, and any transport types used.</li>
                </ul>

                {/* Do */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center">
                      <Check className="w-3 h-3" />
                    </span>
                    <span className="text-sm font-bold text-emerald-700">Do</span>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
                    <li>Landscape photos</li>
                    <li>Minimum of 1280 pixels wide</li>
                    <li>JPG, JPEG, PNG, WebP, or AVIF file types</li>
                    <li>7MB maximum file size</li>
                  </ul>
                </div>

                {/* Don't */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 grid place-items-center">
                      <X className="w-3 h-3" />
                    </span>
                    <span className="text-sm font-bold text-red-600">Don't</span>
                  </div>
                  <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
                    <li>Photographer or logo watermarks</li>
                    <li>Readable license plates</li>
                    <li>AI-generated images</li>
                    <li>Photos of printed maps</li>
                    <li>Branded bus routes</li>
                    <li>Portrait/vertical format</li>
                    <li>Black and white photos</li>
                    <li>Selfies</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
