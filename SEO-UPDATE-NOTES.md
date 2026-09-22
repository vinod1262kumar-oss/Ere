# SEO / Performance update — September 20, 2026

Target domain: https://mishra-dealers-webiste.netlify.app

## Changes
1. Removed the remote hero background image so the first viewport is rendered without waiting for a large third-party image.
2. Removed render-blocking Google Fonts and switched to system/Georgia fallbacks.
3. Added a visible factual property-verification guide and matching Article JSON-LD.
4. Expanded `llms.txt` with concrete business facts and explicit accuracy limits.
5. Updated canonical/OG URLs, robots.txt and sitemap.xml to the latest target domain.
6. Kept fees factual: no invented commission percentage. The site says fees are agreed before the transaction.
7. Did not invent testimonials, certifications, transaction counts, registration numbers, awards or years of experience.

## Deployment
Upload the contents of this folder to Netlify, or replace the current deployment with the ZIP contents. After deployment, run Lighthouse again on the homepage and verify the sitemap at `/sitemap.xml`.


## V3 — Phone Gallery Media Fix
- Property admin now accepts up to 8 photos directly from the phone Gallery.
- Images are resized/compressed to WebP in the browser before upload.
- Uploaded images are stored in Netlify Blobs and served through `/.netlify/functions/media`.
- Property records store a `photos[]` gallery plus the first image as `photo` for backward compatibility.
- Property detail pages display the uploaded gallery.
- Homepage/admin trust video can now be selected directly from the phone Gallery.
- Video uploads use chunked uploads and support files up to 50 MB.
- Homepage video renderer recognizes uploaded Netlify media URLs.
