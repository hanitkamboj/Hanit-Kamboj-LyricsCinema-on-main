# 🎵 LyricCinema — Apple Music Style Lyrics Video Maker

A full-featured, browser-based lyrics video maker with Apple Music-style animations. Create stunning lyric videos with blurred animated backgrounds, word-by-word highlighting, smooth scrolling, and export to MP4 — all free, no server required.

---

## ✨ Features

### 🎨 Visual
- **Apple Music exact aesthetic** — SF Pro Display font, blurred artwork background, smooth animations
- **Animated background** — Canvas-based artwork mosaic with slow drift (like Apple Music / YouTube Music)
- **Line-by-line transitions** — opacity, blur, scale — exactly like Apple Music fullscreen lyrics
- **Word-level lightning highlighting** — TTML files get exact Apple "karaoke fill" animation
- **Auto-scrolling** — Active line stays at 33% from top, smooth 60fps scroll interpolation
- **Fullscreen mode** — No rounded corners, full immersive view

### 🎵 Audio
- Supports: `.mp3`, `.wav`, `.m4a`, `.flac`, `.ogg`
- Custom seek bar, play/pause, time display
- Auto-detects Artist/Title from filename (format: `Artist - Title.mp3`)

### 📝 Lyrics
| Source | Sync Mode | Animation |
|--------|-----------|-----------|
| **lrclib.net auto-fetch** | Line-level LRC | Smooth line transitions |
| **LRC upload** | Line-level | Smooth line transitions |
| **Enhanced LRC upload** | Word-level | Word fill animation |
| **TTML upload** | Word-level (Apple format) | ⚡ Lightning fill effect |
| **SRT upload** | Line-level | Smooth line transitions |
| **Plain text / paste** | Evenly spaced | Line transitions |

### 🎬 Export
- **Browser-based**: WebAssembly FFmpeg — renders frames → encodes H.264 MP4
- **Resolutions**: 720p, 1080p, 4K
- **Frame rates**: 24, 30, 60fps
- **Quality**: High (CRF 18), Medium (CRF 23), Low (CRF 28)
- **Audio**: AAC 192kbps, perfectly synced

---

## 🚀 Free Deployment (No Credit Card)

### Option 1: Vercel (Recommended — 30 seconds)
```bash
npx vercel deploy
```
Or connect GitHub repo → auto-deploys every push.

### Option 2: Netlify
```bash
npm run build
# Drag the `dist/` folder to netlify.com
```

### Option 3: Cloudflare Pages
- Connect GitHub repo in Cloudflare dashboard
- Build command: `npm run build`
- Output directory: `dist`

### Option 4: GitHub Pages
```bash
npm run build
# Push dist/ to gh-pages branch
```

---

## 🖥️ Free Cloud Rendering via GitHub Actions

**2,000 free minutes/month — no credit card required!**

### Setup
1. Fork this repository
2. Go to **Actions** tab → Enable workflows
3. Click **"Render Lyrics Video (Free Cloud)"**
4. Fill in song details → **Run workflow**
5. Download MP4 from **Artifacts**

### Optional: Audio file via secret
1. Upload your audio somewhere (GitHub release, R2, etc.)
2. Add secret `AUDIO_URL` = download URL
3. Workflow downloads & mixes audio automatically

### Full server rendering (node-canvas)
For production quality, install `canvas` package:
```bash
npm install canvas
```
Then modify the render script in `.github/workflows/render-video.yml` to use node-canvas for frame generation.

---

## 💻 Local Development

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## 🏗️ Build

```bash
npm run build
# Single HTML file output in dist/
```

---

## 🏛️ Architecture

```
src/
├── App.tsx                    # Root — step routing
├── store/
│   └── useStore.ts           # Zustand global state
├── types/
│   └── lyrics.ts             # LyricLine, LyricWord types
├── utils/
│   ├── parsers.ts            # LRC, TTML, SRT, plain text parsers
│   ├── lrclib.ts             # lrclib.net API integration
│   └── colorExtract.ts       # Canvas-based color extraction
└── components/
    ├── UploadStep.tsx         # Upload/setup screen
    ├── PreviewScreen.tsx      # Preview + export wrapper
    ├── VideoPreview.tsx       # Video player with controls
    ├── AnimatedBackground.tsx # Canvas-based Apple Music bg
    ├── LyricsDisplay.tsx      # Animated lyrics with auto-scroll
    ├── ArtworkPanel.tsx       # Album art + metadata panel
    └── ExportPanel.tsx        # FFmpeg.wasm export engine
```

### Key Technical Decisions

| Challenge | Solution |
|-----------|----------|
| Apple Music background | Canvas with slow-drift artwork blobs, blur layers, color overlay |
| Smooth scroll | rAF loop with 6.5% lerp toward target position |
| Word lightning | CSS clip-path on progress mask over base text |
| Color extraction | Canvas pixel sampling → bucket sort → darkened palette |
| Video export | FFmpeg.wasm: render JPEG frames → H.264 + AAC mux |
| Lyric fetching | lrclib.net free API, falls back to search |

---

## 📋 Lyrics Format Examples

### LRC (Line sync)
```
[00:12.45] Midnight rain falls on the window
[00:15.80] I can hear the thunder calling
```

### Enhanced LRC (Word sync)  
```
[00:12.45] <00:12.45>Midnight <00:12.90>rain <00:13.20>falls
```

### TTML (Apple Music word sync)
```xml
<p begin="00:12.450" end="00:15.800">
  <span begin="00:12.450" end="00:12.900">Midnight</span>
  <span begin="00:12.900" end="00:13.200">rain</span>
</p>
```

### SRT
```
1
00:00:12,450 --> 00:00:15,800
Midnight rain falls on the window
```

---

## 🎯 Optimization Notes

- **GPU acceleration**: All animations use `transform`, `opacity`, `filter` — compositor thread, no layout thrash
- **will-change**: Applied only to actively animating elements
- **React.memo**: LyricLine and WordHighlight are memoized
- **rAF scroll**: Single requestAnimationFrame loop, not per-state-update
- **Canvas**: Single canvas element, no React re-renders for background
- **Font**: SF Pro Display via system font stack (`-apple-system`), falls back to Inter

---

## 📄 License

MIT — free to use, fork, deploy, and modify.
