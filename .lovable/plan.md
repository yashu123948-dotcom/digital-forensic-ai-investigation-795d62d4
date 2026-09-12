# Launch Console Video Background

## Goal
Use the uploaded cybersecurity video as the continuously animated background of the first homepage launch area, while preserving all text, buttons, links, and existing behavior.

## Changes
- Store the uploaded MP4 as a project media asset and load it from the app’s asset delivery system.
- Replace the current 3D scene only behind the opening launch area with the video to avoid two competing animated backgrounds.
- Configure the video to autoplay, loop, remain muted, play inline on mobile, and never capture clicks.
- Add layered dark and directional overlays so the headline and both action buttons stay readable throughout the loop.
- Add subtle continuous cyber motion: a slow scan line, softly pulsing grid/data accents, and restrained glow around the primary action.
- Respect reduced-motion preferences by pausing decorative animation and showing a stable video frame where appropriate.
- Keep every existing word, section, route, button destination, authentication flow, and feature unchanged.

## Validation
- Check the opening screen at desktop and mobile sizes.
- Confirm the video loops without blocking navigation or button clicks.
- Confirm text contrast, no overlap, and acceptable loading behavior.
- Confirm the rest of the homepage is visually and functionally unchanged.

## Technical details
- The source video is 1280×544, H.264, approximately 5.3 seconds, and is suitable for a wide cinematic background.
- The video will use cover-style sizing with a centered crop and a poster/fallback frame to prevent an empty opening area while loading.
