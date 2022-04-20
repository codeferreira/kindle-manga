const puppeteer = require('puppeteer-extra')
const fs = require('fs');
const userAgent = require('user-agents');
const https = require('https');

const StealthPlugin = require('puppeteer-extra-plugin-stealth')
puppeteer.use(StealthPlugin())

const downloadChapter = async ({url}) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setUserAgent(userAgent.toString());

    const chapter = url.split('/').pop();

    console.log(`Chapter ${chapter}`);
    await page.goto(url);
    console.log('Page loaded');

    
    await Promise.all([
      page.waitForSelector('a.orientation'),
      page.click('a.orientation'),
      page.waitForNavigation()
    ]);
    console.log('Clicked orientation changed');

    await page.evaluate(() => {
      setInterval(() => {
        document.querySelector('body').scrollBy(0, window.innerHeight);
      }, 100)
    });
    await page.waitForTimeout(5000);
    console.log('Scrolled');

    const issueSrcs = await page.evaluate(() => {
      const srcs = Array.from(
        document.querySelectorAll(".manga-image img")
      ).map((image) => image.getAttribute("src"));
      
      return srcs;
    });

    fs.mkdir(`./chapter-${chapter}`, (err) => { 
      if (err) throw err;

      console.log('Directory created');
    })

    for (const src of issueSrcs) { 
      https.get(src, (response) => {
        const writeStream = fs.createWriteStream(`./chapter-${chapter}/${src.split('/').pop()}`);

        response.pipe(writeStream);

        writeStream.on('finish', () => {
          writeStream.close();
          console.log('Image downloaded');
        })
      })
    }
    

    await browser.close();
  } catch (err) {
    console.log(err);
  }
}

module.exports = {
  downloadChapter
};