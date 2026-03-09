import { getPayload } from "payload";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import config from "../src/payload.config";

const payload = await getPayload({ config });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, "images-test");

// Ensure images directory exists
try {
    await fs.access(imagesDir);
} catch (e) {
    console.error("Images directory not found.");
}

const imageMapFilePath = path.join(__dirname, "imageMap.json");
const imageMap: Record<string, number> = {};

let testLimit = 10;
for (const file of await fs.readdir(imagesDir)) {
    if (testLimit-- <= 0) break;
    const filepath = path.join(imagesDir, file);
    const data = await fs.readFile(filepath); // buffer with binary image data

    const mediaDoc = await payload.create({
        collection: "media",
        file: {
            data: new Uint8Array(data) as unknown as Buffer,
            name: file,
            mimetype: "image/jpeg",
            size: data.length
        },
        data: {
            alt: "event image"
        }
    });

    imageMap[file] = mediaDoc.id;
}

// Write image map to JSON file
try {
    await fs.writeFile(imageMapFilePath, JSON.stringify(imageMap), 'utf8');
    console.log('[success] wrote data to output file ');
} catch (error) {
    console.error('Error writing to file:', error);
}