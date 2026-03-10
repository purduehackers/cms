import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pLimit from "p-limit";
import { getPayload } from "payload";
import config from "../src/payload.config";

const payload = await getPayload({ config });
const limit = pLimit(5); // limit to 5 concurrent uploads

// Get directory of current script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const imagesDir = path.join(__dirname, "images");

// Ensure images directory exists
try {
    await fs.access(imagesDir);
} catch (e) {
    console.error("Images directory not found.");
}

const files = await fs.readdir(imagesDir);
const imageMapFilePath = path.join(__dirname, "imageMap.json");
const imageMap: Record<string, number> = {};

let fileNum = 1;
async function uploadImage(file: string) {
    console.log(`[${fileNum++}/${files.length}] starting upload...`);
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
    console.log(`[success] uploaded ${file} with ID ${mediaDoc.id}`);
}

// Read and upload image files concurrently
try {
    await Promise.all(
        files.map(file => limit(() => uploadImage(file)))
    );
} catch (error) {
    console.error("Error uploading images:", error);
}

// Write image map to JSON file
try {
    await fs.writeFile(imageMapFilePath, JSON.stringify(imageMap), 'utf8');
    console.log('[success] wrote data to output file ');
} catch (error) {
    console.error('Error writing to file:', error);
}