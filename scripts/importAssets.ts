import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import pLimit from 'p-limit'
import { getPayload } from 'payload'
import config from '../src/payload.config'

const payload = await getPayload({ config })
const limit = pLimit(5) // limit to 5 concurrent uploads

const DEPLOY_TO_PROD = true
const TEST_BATCH = false
const LOCAL_API = false
const CMS_URL = DEPLOY_TO_PROD ? 'https://cms.purduehackers.com' : 'http://localhost:3000'
const API_KEY = DEPLOY_TO_PROD ? process.env.API_KEY : process.env.API_KEY_DEV

// Get directory of current script
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const imagesDir = path.join(__dirname, TEST_BATCH ? 'images-test' : 'images')

// Ensure images directory exists
try {
  await fs.access(imagesDir)
} catch (e) {
  console.error('Images directory not found.')
}

// Update alt of existing image, given id
async function updateImageAlt(mediaId: number) {
  const res = await fetch(`${CMS_URL}/api/media/${mediaId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `users API-Key ${API_KEY}`,
    },
    body: JSON.stringify({
      alt: 'new alt text',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Failed to patch media: ${text}`)
  }
  const updated = await res.json()
  console.log('Updated media:', updated)
}

const files = await fs.readdir(imagesDir)
const imageMapFilePath = path.join(__dirname, 'imageMap.json')
const imageMap: Record<string, number> = {} // map image file name to id in db

let fileNum = 1

// Read image file and upload to Payload CMS
async function uploadImage(file: string) {
  const currFileNum = fileNum++
  console.log(`[${currFileNum}/${files.length}] starting upload...`)
  const filepath = path.join(imagesDir, file)
  const data = await fs.readFile(filepath) // buffer with binary image data

  let imageId // save for mapping later
  if (!LOCAL_API) {
    // Use http request to write to deployed cms
    if (!API_KEY) {
      throw new Error('API key not provided')
    }

    const blob = new Blob([data], { type: 'image/jpeg' })

    // Use multipart form data to upload media
    const form = new FormData()
    form.append('file', blob, file)
    form.append(
      '_payload',
      JSON.stringify({
        alt: 'event image',
      }),
    )

    try {
      const res = await fetch(`${CMS_URL}/api/media`, {
        method: 'POST',
        headers: {
          Authorization: `users API-Key ${API_KEY}`,
        },
        body: form,
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('Res status', res.status, text)
        throw new Error(`Res status: (${res.status})`)
      }
      const json: any = await res.json()
      imageId = json.doc.id
    } catch (error) {
      console.log(`Error uploading image #${currFileNum}: ${error}`)
    }
  } else {
    // Use local API to test with dev db
    const mediaDoc = await payload.create({
      collection: 'media',
      file: {
        data: new Uint8Array(data) as unknown as Buffer,
        name: file,
        mimetype: 'image/jpeg',
        size: data.length,
      },
      data: {
        alt: 'event image',
      },
    })
    imageId = mediaDoc.id
  }

  if (!imageId) {
    throw new Error(`Upload failed for ${file}`)
  }
  imageMap[file] = imageId
  console.log(`[success] uploaded ${file} with ID ${imageId}`)
}

// Read and upload image files concurrently
try {
  await Promise.all(files.map((file) => limit(() => uploadImage(file))))
} catch (error) {
  console.error('Error uploading images:', error)
}

// Write image map to JSON file
try {
  await fs.writeFile(imageMapFilePath, JSON.stringify(imageMap), 'utf8')
  console.log('[success] wrote data to output file ')
} catch (error) {
  console.error('Error writing to file:', error)
}
