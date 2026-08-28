import { transformImage, getSrcSet } from '@/lib/image'

function buildBreakpoints(width) {
  return [width, Math.round(width * 1.5), width * 2, Math.round(width * 3)]
}

export default function OptimizedImage({
  src,
  width,
  height,
  alt = '',
  loading = 'lazy',
  className = '',
  style,
  fit = 'crop',
  onLoad,
  onError,
  ...imgProps
}) {
  if (!src || (!src.includes('cloudinary') && !src.includes('googleusercontent'))) {
    return <img src={src} alt={alt} loading={loading} className={className} style={style} onLoad={onLoad} onError={onError} {...imgProps} />
  }

  if (src.includes('googleusercontent')) {
    return <img src={src} alt={alt} loading={loading} className={className} style={style} onLoad={onLoad} onError={onError} {...imgProps} />
  }

  const transformOpts = {
    width: width ? width * 2 : undefined,
    height: height ? height * 2 : undefined,
    quality: 'auto:good',
    format: 'auto',
    fit,
  }

  const srcSetWidths = width ? buildBreakpoints(width) : undefined

  return (
    <img
      src={transformImage(src, transformOpts)}
      srcSet={srcSetWidths ? getSrcSet(src, srcSetWidths, transformOpts) : undefined}
      alt={alt}
      loading={loading}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={onError}
      {...imgProps}
    />
  )
}
