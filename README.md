# dblp-rank

A Tampermonkey userscript that enriches [DBLP](https://dblp.uni-trier.de) pages with journal and conference rankings, sourced from **SCImago (SJR)** and **(I)CORE**.

## Features

- Displays **SCImago quartile rankings** (Q1–Q4) for journals directly on DBLP pages, year by year
- Displays **(I)CORE rankings** (A*, A, B, C) for conferences directly on DBLP pages, year by year
- Journals are matched by **ISSN** (from dblp), then by exact title; conferences by acronym, then by exact title. When no exact match exists, the closest title (fuzzy search) is shown, flagged as `≈ closest match`, so it can be checked
- All ranking data is **bundled locally** — no external API calls at runtime, just a single fetch per dataset (see section on Data)
- Full venue names and ISSNs are retrieved with a single query to the [dblp SPARQL endpoint](https://sparql.dblp.org) per page (no scraping of dblp pages), and cached

## Installation

### Production

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension
2. Install the script from [https://openuserjs.org/scripts/thesave/Rank_DBLP]

### Development (header + body split)

For development, the script is split into two files:

| File | Purpose |
|---|---|
| `header_dblp_rank.hs` | Tampermonkey header for production |
| `body_dblp_rank.js` | Script logic (edited in VS Code or any IDE) |

**Steps:**

1. Add the `@require` line to the script's header to point to the local path of `body_dblp_rank.js` on your machine:
   ```javascript
   // @require    file:///path/to/local/folder/containing/body_dblp_rank.js
   ```
2. Enable **local file access** for Tampermonkey in your browser:
   - **Chrome/Edge**: Extensions → Tampermonkey → Details → toggle *Allow access to file URLs*
   - **Firefox**: Add-ons → Tampermonkey → Permissions → toggle *Access your data for all websites*
4. Edit `body_dblp_rank.js` in your IDE — reload the DBLP page to pick up changes instantly, no reinstall needed

## Data

All ranking data is pre-processed and stored as gzip-compressed, base64-encoded JavaScript files under the `data/` folder:

| File | Source | Coverage |
|---|---|---|
| `data/scimago_issn_binary.bin` | [SCImago Journal & Country Rank](https://www.scimagojr.com) (by journal, with ISSNs) | 1999–2025 |
| `data/scimago_binary.bin` | [SCImago Journal & Country Rank](https://www.scimagojr.com) (by title; used by versions ≤ 0.9.2) | 1999–2025 |
| `data/core_binary.bin` | [CORE / ICORE Rankings Portal](https://portal.core.edu.au) | 2008–2026 |

The data is decompressed at runtime in the browser using [fflate](https://github.com/101arrowz/fflate).
No network requests are made to ranking services.

### Matching

Venues are matched to the ranking data in order of reliability:

1. **Journals: ISSN.** dblp's ISSNs (from the SPARQL endpoint) are looked up in the SCImago data. A journal whose ISSNs are not in SCImago is reported as not found (when tested, fuzzy matching in that case only found similarly-named, different journals).
2. **Exact title**, after normalisation (case, accents, punctuation, `&`/`and`, leading "The").
3. **Closest title**, only for conferences and for journals without ISSNs: weighted Jaccard similarity of the titles' words (rare words weigh more), accepted above a threshold of 0.85. These matches are flagged as `≈ closest match: <title>` and should be checked.

Measured on all dblp journals (Nov 2026, SCImago data up to 2025): the 1495 journals ranked by SCImago are all matched correctly by ISSN, and none of the 396 unranked journals gets a fuzzy match (the previous fuzzy search matched 87% correctly, matched 8% to the wrong journal, and gave a rank to 11% of the unranked journals).

### Regenerating the Data

If you want to refresh the data from the latest rankings, you can unzip the (resp.) core.zip and scimago.zip files, which contain the year-by-year CSVs, add the new CSVs, and then use the Python notebook `process_data.ipynb` to process the data. The script integrates all CSVs and generates separete aggegate JSON files (one for core and one for scimago). These JSON files contain the whole "history" of the rankings (year-by-year). To compress the data, the script generates compressed versions of those JSONs preserving only ranking changes -- e.g., conference XYZ was a "B" in 2008, confirmed in 2010 and 2012, since 2015 it became an "A", confirmed in all subsequent years; the compressed version of the dataset contains only the year changes, i.e., `{ "XYZ" : { rankings: { "2008": "B", "2015": "A" } } }`. The script further compresses the compressed JSONs into the .bin that are fetched by the Tampermonkey script using base64 and gzip.

## Contributing

Contributions are welcome. For development, use the header+body split workflow described above. When submitting a PR that updates ranking data, please regenerate the `data/` files using the provided Python scripts and include them in the PR.