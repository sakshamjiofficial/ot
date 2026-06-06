# FFmpeg Command Reference — OTT Platform

## 1. Video Probe
```bash
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

## 2. Single Rendition — 1080p HLS
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -profile:v high -level 4.1 \
  -preset faster -crf 23 \
  -maxrate 5350k -bufsize 7500k -b:v 5000k \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,\
       pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:a aac -b:a 192k -ac 2 -ar 44100 \
  -g 150 -keyint_min 150 -sc_threshold 0 \
  -threads 0 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_type mpegts \
  -hls_segment_filename "1080p/seg_%04d.ts" \
  -hls_flags independent_segments \
  -hls_list_size 0 \
  -movflags +faststart \
  -map 0:v:0 -map 0:a:0 \
  1080p/index.m3u8
```

## 3. 720p HLS
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -profile:v high -level 4.1 \
  -preset faster -crf 23 \
  -maxrate 3000k -bufsize 4200k -b:v 2800k \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,\
       pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:a aac -b:a 128k -ac 2 -ar 44100 \
  -g 150 -keyint_min 150 -sc_threshold 0 -threads 0 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "720p/seg_%04d.ts" \
  -hls_flags independent_segments -hls_list_size 0 \
  -map 0:v:0 -map 0:a:0 \
  720p/index.m3u8
```

## 4. 480p HLS
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset faster -crf 24 \
  -maxrate 1500k -bufsize 2100k -b:v 1400k \
  -vf "scale=854:480:force_original_aspect_ratio=decrease,\
       pad=854:480:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:a aac -b:a 128k -ac 2 -ar 44100 \
  -g 150 -keyint_min 150 -sc_threshold 0 -threads 0 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "480p/seg_%04d.ts" \
  -hls_flags independent_segments -hls_list_size 0 \
  -map 0:v:0 -map 0:a:0 \
  480p/index.m3u8
```

## 5. 360p HLS
```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -preset faster -crf 25 \
  -maxrate 856k -bufsize 1200k -b:v 800k \
  -vf "scale=640:360:force_original_aspect_ratio=decrease,\
       pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1" \
  -c:a aac -b:a 96k -ac 2 -ar 44100 \
  -g 150 -keyint_min 150 -sc_threshold 0 -threads 0 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "360p/seg_%04d.ts" \
  -hls_flags independent_segments -hls_list_size 0 \
  -map 0:v:0 -map 0:a:0 \
  360p/index.m3u8
```

## 6. Extract single audio track to HLS
```bash
ffmpeg -i input.mkv \
  -map 0:a:0 \
  -c:a aac -b:a 128k -ac 2 \
  -f hls -hls_time 6 -hls_playlist_type vod \
  -hls_segment_filename "audio/en/seg_%04d.ts" \
  -hls_list_size 0 \
  audio/en/index.m3u8
```

## 7. Extract subtitle stream to WebVTT
```bash
ffmpeg -i input.mkv \
  -map 0:s:0 \
  -f webvtt \
  subtitles/en.vtt
```

## 8. Extract thumbnail frame
```bash
ffmpeg -ss 300 -i input.mp4 \
  -vframes 1 -q:v 2 \
  thumbnail_raw.jpg
```

## 9. Generate sprite frames (1 per 10 seconds)
```bash
ffmpeg -i input.mp4 \
  -vf "select=not(mod(t\,10)),scale=160:90" \
  -vsync vfr -q:v 4 \
  sprite-frames/frame_%04d.jpg
```

## 10. Burn subtitles hardcoded (optional, for previews)
```bash
ffmpeg -i input.mp4 \
  -vf "subtitles=en.srt:force_style='Fontname=Arial,FontSize=24'" \
  output_with_subs.mp4
```

## Hardware Acceleration (future — when using GPU node)
```bash
# NVIDIA NVENC (add to CX33 + A100 Hetzner dedicated)
ffmpeg -hwaccel cuda -hwaccel_output_format cuda \
  -i input.mp4 \
  -c:v h264_nvenc -preset p4 -rc vbr \
  -b:v 5000k -maxrate 5350k -bufsize 7500k \
  output.mp4

# Intel QSV (on Intel iGPU VMs)
ffmpeg -hwaccel qsv -i input.mp4 \
  -c:v h264_qsv -b:v 5000k \
  output.mp4
```

## Encoding Time Estimates (CX23: 3 ARM vCPU)
| Source  | Renditions | Estimated Time |
|---------|-----------|----------------|
| 90-min 1080p MP4  | 4 renditions | ~25-40 min |
| 45-min 1080p MKV  | 4 renditions | ~12-20 min |
| 45-min 720p MP4   | 3 renditions | ~8-14 min  |

## Bitrate Decision Guide
| Use Case          | CRF | Preset   |
|-------------------|-----|----------|
| Live streaming    | 28  | ultrafast|
| VOD standard      | 23  | faster   |
| VOD high quality  | 20  | medium   |
| Archive master    | 18  | slow     |
