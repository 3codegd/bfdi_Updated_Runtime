// server.js (or your main server file)
import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.YT_API_KEY; // store in Render environment variable
const PLAYLIST_IDS = [
  'PLbDP9HpqeU_OJlQc0ym7ELpgep5o648VF', // Season 1
  'PLbDP9HpqeU_Ntqqnfprn1RemanAZFn_v8', // Season 2
  'PLbDP9HpqeU_MU2AT6S1ugGFVXXGiBIQBb', // Season 3
  'PLbDP9HpqeU_NPbkbT3gVkEGXzLvuFuOOi', // Season 4a
  'PLbDP9HpqeU_Nma9d3RSfX2cZVG-W2VeOa', // Season 4b
  'PLbDP9HpqeU_OX4K6rmeVfocfbrZdt5rx0', // Season 5
];

async function fetchPlaylistItems(playlistId) {
  let results = [];
  let nextPageToken = '';

  do {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${playlistId}&key=${API_KEY}&pageToken=${nextPageToken}`
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    results = results.concat(data.items);
    nextPageToken = data.nextPageToken || '';
  } while (nextPageToken);

  return results;
}

async function fetchVideoDetails(videoIds) {
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`
  );
  const data = await res.json();
  return data.items;
}

app.get('/episodes', async (req, res) => {
  try {
    let allEpisodes = [];

    for (let pid of PLAYLIST_IDS) {
      const playlistItems = await fetchPlaylistItems(pid);
      const videoIds = playlistItems.map(item => item.contentDetails.videoId);
      const videoDetails = await fetchVideoDetails(videoIds);

      const eps = videoDetails.map(v => ({
        title: v.snippet.title,
        date: v.snippet.publishedAt,
        length: v.contentDetails.duration, // ISO 8601 format (e.g. PT3M12S)
        thumbnail: v.snippet.thumbnails.medium.url,
      }));

      allEpisodes = allEpisodes.concat(eps);
    }

    // Sort by date
    allEpisodes.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(allEpisodes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
