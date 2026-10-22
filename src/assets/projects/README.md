# Project screenshots (optional)

Make a folder named after the project's `id` (from `projects` in src/data/content.ts)
and drop images in. They show up automatically in that world's expanded view.

    origin-story/   uni-management/   signal/   portfolio/

- Example: `signal/01-attack-graph.webp`, `signal/02-compliance-report.png`
- Order = filename order (use 01-, 02- … prefixes); the first image is shown first
- Formats: .webp (preferred), .jpg, .jpeg, .png, .avif, .gif
- Size: ~1600 px wide, ideally under 300 KB each (16:10 or 16:9 fits best)
- Alt text is made from the filename ("02-compliance-report" → "Compliance report").
  For a custom caption/alt, add to that project in content.ts:
  `images: [{ src: '02-compliance-report.png', alt: 'Compliance score report', caption: 'SOC 2 / OWASP scoring' }]`
