import express from 'express';
import fetch from 'node-fetch';

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

async function scrapePlaylist(playlistId) {
  const url = getPlaylistUrl(playlistId);
  const res = await fetch(url);
  const html = await res.text();

  // Extract ytInitialData JSON blob from page source
  const initialDataMatch = html.match(/var ytInitialData = (.+?);\n/);
  if (!initialDataMatch) {
    console.error('Failed to find ytInitialData');
    return [];
  }

  let initialData;
  try {
    initialData = JSON.parse(initialDataMatch[1]);
  } catch (e) {
    console.error('Failed to parse ytInitialData JSON', e);
    return [];
  }

  // Navigate through JSON to find playlist videos info
  const videoItems =
    initialData?.contents?.twoColumnBrowseResultsRenderer?.tabs[0]?.tabRenderer
      ?.content?.sectionListRenderer?.contents[0]?.itemSectionRenderer?.contents[0]
      ?.playlistVideoListRenderer?.contents || [];

  const episodes = videoItems.map((item) => {
    const video = item.playlistVideoRenderer;
    return {
      videoId: video.videoId,
      title: video.title.runs[0].text,
      thumbnail: video.thumbnail.thumbnails.pop().url,
      publishedAt: video.publishedTimeText?.simpleText || '',
      length: video.lengthText?.simpleText || '',
    };
  });

  return episodes;
}

let episodes = [];

async function updateAllEpisodes() {
  let allEpisodes = [];
  for (const id of PLAYLIST_IDS) {
    try {
      const eps = await scrapePlaylist(id);
      allEpisodes = allEpisodes.concat(eps);
    } catch (err) {
      console.error(`Failed scraping playlist ${id}:`, err);
    }
  }

  // Remove duplicates by videoId
  const seen = new Set();
  episodes = allEpisodes.filter((ep) => {
    if (!seen.has(ep.videoId)) {
      seen.add(ep.videoId);
      return true;
    }
    return false;
  });

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
