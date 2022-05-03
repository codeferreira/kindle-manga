#!/usr/bin/env node

import { program } from 'commander';
import { downloadChapter } from './download.js';

program
  .name('Kindle Manga')
  .version('0.0.1')
  .description('Download manga from Manga and send to Kindle');

program
  .command('download')
  .argument('<manga-name>', 'Manga name')
  .requiredOption('-u, --url <url>', 'Manga URL')
  .description('Download manga from Manga and send to Kindle')
  .action(async (manga, options) => {
    const mangaName = manga.toLowerCase().split(' ').join('-');
    await downloadChapter(options.url, manga);
  });

program.parse();