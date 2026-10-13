/**
 * Redimensionne et recompresse une image (JPEG) côté navigateur avant envoi.
 * Passer par un canvas permet aussi d'appliquer l'orientation EXIF (photos iOS) et de
 * convertir les formats non supportés par le serveur (ex: HEIC converti par Safari).
 */
export async function resizeImage(file: File, maxSize = 1600, quality = 0.8): Promise<Blob> {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const ratio = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * ratio)
    canvas.height = Math.round(bitmap.height * ratio)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Conversion de l'image impossible")), 'image/jpeg', quality)
    })
}
