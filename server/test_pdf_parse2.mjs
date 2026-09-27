import { PDFParse } from 'pdf-parse';
import fs from 'fs';

async function test() {
    const buffer = fs.readFileSync('./package.json'); // not a pdf, but let's see if we can instantiate it
    const parser = new PDFParse({ data: buffer });
    try {
        await parser.getInfo();
    } catch (e) {
        console.log(e.message);
    }
}
test();
