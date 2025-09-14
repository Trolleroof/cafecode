# Demo Videos

This directory contains demo videos for the hero section.

## Video Requirements

- **Format**: MP4 (primary) and WebM (fallback)
- **Aspect Ratio**: 16:9 (recommended)
- **Resolution**: 1920x1080 or higher
- **Duration**: 30-90 seconds (optimal for user engagement)
- **File Size**: Keep under 10MB for fast loading

## Files to Add

Replace these placeholder paths in `/app/page.tsx`:

- `demo.mp4` - Main demo video (MP4 format)
- `demo.webm` - Fallback demo video (WebM format)

## Current Implementation

The hero section video:
- Uses your existing `/images/demo.png` as a poster image
- Has fallback handling for unsupported browsers
- Includes smooth scrolling and auto-play on "Watch Demo" button click
- Features hover effects and interactive elements
- Responsive design that works on all screen sizes

## Tips for Demo Video

1. **Show the key features** of your coding platform
2. **Keep it engaging** - start with the most impressive feature
3. **Add captions** if there's no audio
4. **Test on mobile** to ensure good performance
5. **Consider autoplay** vs user-initiated play based on your audience

## Browser Support

- Modern browsers support both MP4 and WebM
- Falls back to poster image if video fails to load
- Mobile-optimized with `playsInline` attribute
