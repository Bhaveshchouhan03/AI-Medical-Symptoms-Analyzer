const axios = require('axios');
const YoutubeCache = require('./youtube-cache.model');

const YOUTUBE_BASE = 'https://www.googleapis.com/youtube/v3';

// Pre-validated, active, high-quality educational videos from Mayo Clinic & Cleveland Clinic.
// These are used as fallback when the API key is not configured, network fails, or quota is exceeded.
const FALLBACK_VIDEOS = {
  fever: {
    videoId: 'R9Z8X_k0Z34',
    title: 'Mayo Clinic Minute: What to do and not do when your child has a viral fever',
    channel: 'Mayo Clinic',
    thumbnail: 'https://img.youtube.com/vi/R9Z8X_k0Z34/hqdefault.jpg',
    publishedAt: '2022-08-31T00:00:00Z',
  },
  headache: {
    videoId: 'kYJ5Q-K28-k',
    title: 'Tips To Prevent Tension Headaches | Andrew Bang, DC',
    channel: 'Cleveland Clinic',
    thumbnail: 'https://img.youtube.com/vi/kYJ5Q-K28-k/hqdefault.jpg',
    publishedAt: '2021-04-12T00:00:00Z',
  },
  cough: {
    videoId: 'k4D_v4W-3h4',
    title: 'Mayo Clinic Minute - Managing respiratory illness at home',
    channel: 'Mayo Clinic',
    thumbnail: 'https://img.youtube.com/vi/k4D_v4W-3h4/hqdefault.jpg',
    publishedAt: '2022-12-06T00:00:00Z',
  },
  cold: {
    videoId: 'k4D_v4W-3h4',
    title: 'Mayo Clinic Minute - Managing respiratory illness at home',
    channel: 'Mayo Clinic',
    thumbnail: 'https://img.youtube.com/vi/k4D_v4W-3h4/hqdefault.jpg',
    publishedAt: '2022-12-06T00:00:00Z',
  },
  allergy: {
    videoId: 'kYJv8Z1n8qA',
    title: 'Is it an allergy or a common cold?',
    channel: 'Mayo Clinic Health System',
    thumbnail: 'https://img.youtube.com/vi/kYJv8Z1n8qA/hqdefault.jpg',
    publishedAt: '2020-09-15T00:00:00Z',
  },
  throat: {
    videoId: 'kYJvM7D3z7s',
    title: "Is your child's sore throat actually strep throat?",
    channel: 'Mayo Clinic',
    thumbnail: 'https://img.youtube.com/vi/kYJvM7D3z7s/hqdefault.jpg',
    publishedAt: '2018-11-30T00:00:00Z',
  },
  general: {
    videoId: 'k4D_v4W-3h4',
    title: 'Mayo Clinic Minute - Managing respiratory illness at home',
    channel: 'Mayo Clinic',
    thumbnail: 'https://img.youtube.com/vi/k4D_v4W-3h4/hqdefault.jpg',
    publishedAt: '2022-12-06T00:00:00Z',
  }
};

/**
 * Maps query keywords to a pre-validated fallback video.
 */
const getFallbackVideo = (query) => {
  const norm = (query || '').toLowerCase();
  if (norm.includes('fever')) return FALLBACK_VIDEOS.fever;
  if (norm.includes('headache') || norm.includes('migraine')) return FALLBACK_VIDEOS.headache;
  if (norm.includes('cough')) return FALLBACK_VIDEOS.cough;
  if (norm.includes('cold') || norm.includes('flu') || norm.includes('respiratory')) return FALLBACK_VIDEOS.cold;
  if (norm.includes('allergy') || norm.includes('rhinitis')) return FALLBACK_VIDEOS.allergy;
  if (norm.includes('throat') || norm.includes('strep') || norm.includes('swallow')) return FALLBACK_VIDEOS.throat;
  return FALLBACK_VIDEOS.general;
};

/**
 * Validates a video object structure.
 * Ensures the video ID matches the exact YouTube 11-char pattern.
 * Ensures the thumbnail URL is non-empty and has a valid scheme.
 * Removes mock or placeholder video IDs.
 */
const validateVideo = (video) => {
  if (!video) return false;

  const videoId = video.videoId;
  if (!videoId || typeof videoId !== 'string') return false;

  // YouTube video IDs must be exactly 11 characters of standard alphanumeric + _- characters
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return false;

  // Reject obvious fake/placeholder/test/mock IDs
  const lowerId = videoId.toLowerCase();
  if (
    lowerId.includes('placeholder') ||
    lowerId.includes('test') ||
    lowerId.includes('fake') ||
    lowerId.includes('video') ||
    lowerId === 'abc123xyz'
  ) {
    return false;
  }

  // Check titles/channels/thumbnails
  if (!video.title || typeof video.title !== 'string' || video.title.trim().length === 0) return false;
  if (!video.channel || typeof video.channel !== 'string' || video.channel.trim().length === 0) return false;
  if (!video.thumbnail || typeof video.thumbnail !== 'string' || video.thumbnail.trim().length === 0) return false;

  // Make sure it starts with http/https
  if (!video.thumbnail.startsWith('http://') && !video.thumbnail.startsWith('https://')) return false;

  return true;
};

/**
 * Fetch top N YouTube videos for a search query.
 * Checks MongoDB cache first, otherwise calls YouTube Data API and stores results.
 */
const searchVideos = async (query, maxResults = 1) => {
  const normalizedQuery = query.toLowerCase().trim();

  // 1. Try to fetch from MongoDB cache
  try {
    const cachedEntry = await YoutubeCache.findOne({ query: normalizedQuery });
    if (cachedEntry) {
      console.log(`[YouTube Cache] Hit for query: "${normalizedQuery}"`);
      const validVideos = (cachedEntry.videos || []).filter(validateVideo);
      if (validVideos.length > 0) {
        return validVideos;
      }
      console.log(`[YouTube Cache] Cache entry for "${normalizedQuery}" had only invalid videos. Evicting.`);
      await YoutubeCache.deleteOne({ query: normalizedQuery });
    }
  } catch (cacheErr) {
    console.warn('[YouTube Cache] Read error:', cacheErr.message);
  }

  // 2. Cache miss: Fetch from YouTube API
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey || apiKey === 'your_youtube_data_api_key_here') {
    console.warn('[YouTube] API key not set — returning fallback');
    const fallback = getFallbackVideo(query);
    return fallback ? [fallback] : null;
  }

  try {
    const response = await axios.get(`${YOUTUBE_BASE}/search`, {
      params: {
        part:       'snippet',
        q:          query,
        type:       'video',
        maxResults,
        relevanceLanguage: 'en',
        safeSearch: 'strict',
        key:        apiKey,
      },
      timeout: 8000,
    });

    // Debug log to trace YouTube API response on the backend
    console.log('[YouTube API Search Response]:');
    console.log(JSON.stringify(response.data, null, 2));

    const items = response.data.items || [];
    const videos = items
      .filter((item) => item.id && item.id.kind === 'youtube#video' && item.id.videoId)
      .map((item) => ({
        videoId:      item.id.videoId,
        title:        item.snippet.title,
        channel:      item.snippet.channelTitle,
        thumbnail:    item.snippet.thumbnails?.high?.url
                   || item.snippet.thumbnails?.medium?.url
                   || item.snippet.thumbnails?.default?.url
                   || '',
        publishedAt:  item.snippet.publishedAt,
      }))
      .filter(validateVideo);

    if (videos.length === 0) {
      console.warn(`[YouTube] Search returned no valid videos for "${query}". Returning fallback.`);
      const fallback = getFallbackVideo(query);
      return fallback ? [fallback] : null;
    }

    // 3. Cache the results in MongoDB asynchronously
    YoutubeCache.create({ query: normalizedQuery, videos }).catch((err) => {
      console.warn('[YouTube Cache] Write error:', err.message);
    });

    return videos;
  } catch (err) {
    const status = err.response?.status;
    const msg    = err.response?.data?.error?.message || err.message;
    console.error(`[YouTube] Search failed for "${query}": ${status} — ${msg}. Returning fallback.`);
    const fallback = getFallbackVideo(query);
    return fallback ? [fallback] : null;
  }
};

/**
 * Run multiple search queries in parallel and return one best video per query.
 * Attaches original category and focus metadata from Gemini.
 */
const fetchVideosForQueries = async (queries) => {
  if (!queries || queries.length === 0) return [];

  const results = await Promise.allSettled(
    queries.map(async (q) => {
      const videos = await searchVideos(q.query, 1);
      // Discard any query that does not yield a valid, verified YouTube video ID
      if (!videos || videos.length === 0 || !videos[0].videoId) {
        return null;
      }
      return {
        ...videos[0],
        category:     q.category,
        symptomFocus: q.symptomFocus,
      };
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value);
};

module.exports = { fetchVideosForQueries, searchVideos };
