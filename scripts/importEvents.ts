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
async function importEvent(eventObj: any) {
  console.log(`[${eventNum++}/${importQueue.length}] starting upload...`)

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

  const eventDoc = await payload.create({
    collection: 'events',
    data: payloadEvent,
  })

  console.log(`[success] created ${eventDoc.name} with ID ${eventDoc.id}`)
}

const testLimit = 5
const lineNum = 0
rl.on('line', (line) => {
  //if (++lineNum > testLimit) rl.close();

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
