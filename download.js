import axios from 'axios';
import fs from 'fs';
import sizeOf from 'image-size';
import path from 'path';
import PDFDocument from 'pdfkit';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import userAgent from 'user-agents';

puppeteer.use(StealthPlugin())

async function downloadImage(url, path) {
  const writer = fs.createWriteStream(path)

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      writer.close();
      resolve();
    })
    writer.on('error', reject)
  })
}

async function getImagesSrc(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent(userAgent.toString());

  const chapter = url.split('/').pop();

  console.log(`Chapter ${chapter} - ${mangaName}`);
  await page.goto(url);
  console.log('Page loaded');


  await Promise.all([
    page.waitForSelector('a.orientation'),
    page.click('a.orientation'),
    page.waitForNavigation()
  ]);

  await page.evaluate(() => {
    setInterval(() => {
      document.querySelector('body').scrollBy(0, window.innerHeight);
    }, 100)
  });
  await page.waitForTimeout(5000);

  const issueSrcs = await page.evaluate(() => {
    const srcs = Array.from(
      document.querySelectorAll(".manga-image img")
    ).map((image) => image.getAttribute("src"));

    return srcs;
  });

  await browser.close();

  return issueSrcs;
}

export const downloadChapter = async (url, mangaName) => {
  try {
    const issueSrcs = await getImagesSrc(url);

    const dir = path.join(process.cwd(), 'kmanga');

    if (!fs.existsSync(dir)) {
      console.log('Creating Folder');
      fs.mkdirSync(dir);
    }

    const mangaDir = path.join(dir, mangaName);

    if (!fs.existsSync(mangaDir)) {
      console.log('Creating Manga Folder');
      fs.mkdirSync(mangaDir);
    }

    if (!fs.existsSync(path.join(mangaDir, 'images'))) {
      fs.mkdirSync(path.join(mangaDir, 'images'));
    }


    console.log('Downloading images');
    await Promise.all(issueSrcs.map(async (src) => {
      const issue = src.split('/').pop();
      const issueDir = path.join(mangaDir, 'images', issue);
      await downloadImage(src, issueDir);
    }))

    console.log(`Creating PDF for ${chapter}`);
    const pdf = new PDFDocument({ autoFirstPage: false });
    pdf.pipe(fs.createWriteStream(path.join(mangaDir, `${mangaName} - ${chapter}.pdf`)));

    fs.readdirSync(path.join(mangaDir, 'images')).forEach(file => {
      const dimensions = sizeOf(path.join(mangaDir, 'images', file));
      pdf.addPage({ size: [dimensions.width, dimensions.height] });
      pdf.image(path.join(mangaDir, 'images', file), 0, 0);
    });

    pdf.end();
  } catch (err) {
    console.log(err);
  }
}