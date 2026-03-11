import 'dotenv/config'
import { access, readFile } from 'fs/promises'
import { createReadStream } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import readline from 'readline'
import pLimit from 'p-limit'
import { getPayload } from 'payload'

import config from '../src/payload.config'
import { mapImages, inferEventType, toLexical, mapStats } from './eventMappingUtils'

const payload = await getPayload({ config })
const limit = pLimit(5) // limit to 5 concurrent uploads

const DEPLOY_TO_PROD = true
const TEST_BATCH = false
const LOCAL_API = false
const CMS_URL = DEPLOY_TO_PROD ? 'https://cms.purduehackers.com' : 'http://localhost:3000'
const API_KEY = DEPLOY_TO_PROD ? process.env.API_KEY : process.env.API_KEY_DEV

// Get directory of current script
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataFile = path.join(__dirname, 'data.ndjson')

// Ensure data file exists
try {
  await access(dataFile)
} catch (e) {
  console.error('Import data file not found.')
}

const imageMappingFile = path.join(__dirname, 'imageMap.json')
const imageMap = JSON.parse(await readFile(imageMappingFile, 'utf8'))

// Create file stream and read line by line
const fileStream = createReadStream(dataFile)
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity,
})
const importQueue: Promise<any>[] = []

let eventNum = 1

// Map and import past event object, link to relevant image ids
async function importEvent(eventObj: any) {
  const currEventNum = eventNum++
  console.log(`[${currEventNum}/${importQueue.length}] starting upload...`)

  // Build payload event
  const images = mapImages(eventObj.recapImages, imageMap)
  const payloadEvent = {
    name: eventObj.name,
    published: eventObj.name.toLowerCase().includes('test') ? false : true,
    eventType: inferEventType(eventObj.name),
    start: eventObj.start,
    end: eventObj.end,
    location_name: eventObj.loc ?? null,
    location_url: eventObj.gMap ?? null,
    stats: mapStats(eventObj),
    description: toLexical(eventObj.pastEventDesc ? eventObj.pastEventDesc : eventObj.desc),
    images,
  }

  let eventId
  if (!LOCAL_API) {
    // Use http request to write to deployed cms
    if (!API_KEY) {
      throw new Error('API key not provided')
    }

    try {
      const res = await fetch(`${CMS_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `users API-Key ${API_KEY}`,
        },
        body: JSON.stringify(payloadEvent),
      })
      if (!res.ok) {
        const text = await res.text()
        console.error('Res status', res.status, text)
        throw new Error(`Res status: (${res.status})`)
      }
      const json: any = await res.json()
      eventId = json.doc.id
    } catch (error) {
      console.log(`Error uploading event #${currEventNum}: ${error}`)
    }
  } else {
    // Use local API to test with dev db
    const eventDoc = await payload.create({
      collection: 'events',
      data: payloadEvent,
    })
    eventId = eventDoc.id
  }

  if (!eventId) {
    throw new Error(`Upload failed for ${eventObj.name}`)
  }

  console.log(`[success] created ${eventObj.name} with ID ${eventId}`)
}

const testLimit = 5
let lineNum = 1
rl.on('line', (line) => {
  if (TEST_BATCH && lineNum++ > testLimit) rl.close()

  const trimmedLine = line.trim()
  if (trimmedLine) {
    try {
      // Parse line as json object, add import operation to concurrency queue
      const eventObj = JSON.parse(trimmedLine)
      if (eventObj.name && eventObj.desc) importQueue.push(limit(() => importEvent(eventObj)))
    } catch (e) {
      console.error('Error parsing JSON on line:', line, e)
    }
  }
})

rl.on('close', async () => {
  console.log('[update] finished reading NDJSON file. starting imports...')
  await Promise.all(importQueue)
  console.log('[success] finished importing events')
})

rl.on('error', (err) => {
  console.error('Error reading the file:', err)
})
