/**
 * Cloudflare R2 client — server-only
 * Gunakan untuk upload/delete objek dari server actions atau API routes.
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

// Validasi env saat module di-load (server-side only)
function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME
  const publicUrl = process.env.R2_PUBLIC_URL // e.g. https://pub-xxx.r2.dev atau custom domain

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 configuration incomplete. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME in .env"
    )
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl }
}

function createR2Client() {
  const { accountId, accessKeyId, secretAccessKey } = getR2Config()
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

/**
 * Upload file ke R2.
 * @param key  Path di bucket, e.g. "logos/store-logo.png"
 * @param body Buffer atau Uint8Array
 * @param contentType MIME type, e.g. "image/png"
 * @returns URL publik file
 */
export async function uploadToR2(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const config = getR2Config()
  const client = createR2Client()

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  )

  // Kembalikan URL publik
  const base = config.publicUrl?.replace(/\/$/, "") ?? `https://${config.bucket}.r2.dev`
  return `${base}/${key}`
}

/**
 * Hapus objek dari R2.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const config = getR2Config()
  const client = createR2Client()
  await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
}

/**
 * Generate presigned URL untuk upload langsung dari browser (opsional, untuk future use).
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300 // 5 menit
): Promise<string> {
  const config = getR2Config()
  const client = createR2Client()
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Ekstrak key dari URL publik R2.
 * e.g. "https://pub-xxx.r2.dev/logos/store-logo.png" → "logos/store-logo.png"
 */
export function extractR2Key(url: string): string | null {
  try {
    const u = new URL(url)
    return u.pathname.replace(/^\//, "")
  } catch {
    return null
  }
}
