export async function fetchSpotifyData(spotifyUrl: string) {
  try {
    const url = `https://hanit-api.vercel.app/api/v1/getSongData?url=${encodeURIComponent(
      spotifyUrl
    )}`;
    
    let res;
    try {
      res = await fetch(url);
    } catch (networkErr: any) {
      throw new Error(`Connection blocked or failed. Please check your internet connection and disable ad-blockers or Brave Shields for this site.`);
    }

    if (!res.ok) {
      throw new Error(`Failed to fetch from Spotify API: ${res.status}`);
    }
    
    const json = await res.json();
    return json;
  } catch (err) {
    console.error('Error fetching Spotify info:', err);
    throw err;
  }
}

