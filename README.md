# CAOS silenciado · Mission Echoes

Bilingual, scroll-driven 3D story about NASA hardware that reached the Moon and Mars, made for the NASA Space Apps Challenge 2026.

## Preview locally

Open [`site/index.html`](site/index.html) in a modern browser. The interactive models and assets are bundled locally; internet access is needed only to follow the linked NASA sources.

## Publish with GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` publishes the `site/` folder whenever a commit reaches `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The deployment URL will be shown by the workflow after its first successful run.

## Notes

- The 3D models are illustrative reconstructions, not engineering CAD or to scale.
- Mission facts and archival photographs are credited and linked in the site.
- Three.js is included as a local build; its MIT license is in `site/assets/js/THREE-LICENSE.txt`.
