import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = process.env.PORT || 3000;

const PLAYLIST_IDS = [
  'PLbDP9HpqeU_OJlQc0ym7ELpgep5o648VF', // Season 1
  'PLbDP9HpqeU_Ntqqnfprn1RemanAZFn_v8', // Season 2
  'PLbDP9HpqeU_MU2AT6S1ugGFVXXGiBIQBb', // Season 3
  'PLbDP9HpqeU_NPbkbT3gVkEGXzLvuFuOOi', // Season 4a
  'PLbDP9HpqeU_Nma9d3RSfX2cZVG-W2VeOa', // Season 4b
  'PLbDP9HpqeU_OX4K6rmeVfocfbrZdt5rx0', // Season 5
];

function getPlaylistUrl(id) {
  return `https://www.youtube.com/playlist?list=${id}`;
}

let episodes = [];

async function scrapePlaylist(url) {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const playlistEpisodes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('ytd-playlist-video-renderer')).map(el => {
      const titleEl = el.querySelector('#video-title');
      const thumbnailEl = el.querySelector('img#img');

      return {
        title: titleEl?.textContent.trim() || '',
        videoId: titleEl?.href?.split('v=')[1]?.split('&')[0] || '',
        thumbnail: thumbnailEl?.src || ''
      };
    });
  });

  await browser.close();
  return playlistEpisodes;
}

async function updateAllEpisodes() {
  let allEpisodes = [];
  for (const id of PLAYLIST_IDS) {
    try {
      const url = getPlaylistUrl(id);
      const eps = await scrapePlaylist(url);
      allEpisodes = allEpisodes.concat(eps);
    } catch (err) {
      console.error(`Failed scraping playlist ${id}:`, err);
    }
  }

  // Remove duplicates by videoId
  const uniqueEpisodes = [];
  const seen = new Set();
  for (const ep of allEpisodes) {
    if (ep.videoId && !seen.has(ep.videoId)) {
      seen.add(ep.videoId);
      uniqueEpisodes.push(ep);
    }
  }

  episodes = uniqueEpisodes;
  console.log(`Scraped ${episodes.length} episodes.`);
}

app.get('/episodes', (req, res) => {
  res.json(episodes);
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await updateAllEpisodes();
  console.log('Initial scrape done.');
});
