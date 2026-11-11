function removeInformal() {
  window.initalised = Promise.withResolvers();
  init();
  $("#show-informal").trigger("click");
  setTimeout(openMore, 250);
}

function addPendingCall() {
  if ( window.pendingCalls == 0 ){
    document.querySelector("#clear_cache").parentNode.insertAdjacentHTML("beforeEnd", "<li id='pending-calls-item' style='margin-left:1em;color:white;display:inline-block;cursor:pointer;'>Pending calls: <span id='pending-calls'>0</span></li>");
  }
  document.querySelector("#pending-calls").textContent = ++window.pendingCalls;
}

function removePendingCall() {
  document.querySelector("#pending-calls").textContent = --window.pendingCalls;
  if( window.pendingCalls == 0 ){
    document.querySelector("#pending-calls-item").remove();
  }
}

function openMore() {
  var moreButton = $("div.refine-by.venue >  ul.more-options");
  if ($(moreButton).is(":visible")) {
    $(moreButton).find("li > button").trigger("click");
    setTimeout(function () { openMore() }, 250);
  } else {
    window.pendingCalls = 0;
    window.initalised.promise.then(() => {
      rankConferencesGRIN();
      rankJournalsSCIMAGO();
    });
  }
}

function rankConferencesGRIN() {
  const venues = document.querySelectorAll(".inproceedings .title + a");
  venues.forEach(venueItem => rankConferenceGRIN(venueItem));
}

async function rankConferenceGRIN(venueItem) {
  const venueAcronym = venueItem.textContent.replace(/\d+/g, "").replace(/\(.*\)/g, "").trim();
  const year = parseInt(venueItem.querySelector("span[itemprop='datePublished']").textContent.trim());
  const show = (venueName, result) =>
    venueItem.parentNode.insertAdjacentHTML("beforeEnd", renderRanking("CORE", venueName, result, year));
  const result = searchCoreAcronym(venueAcronym);
  if (result.rankings) {
    show(result.title, result);
  } else {
    addPendingCall();
    const venue = await getVenueInfo(venueItem.getAttribute("href"));
    removePendingCall();
    if (!venue.name) {
      show(result.title, result);
    } else {
      show(venue.name, searchCoreFullName(venue.name));
    }
  }
}

// HTML line with the ranking of a venue in the given year.
// Approximate matches (fuzzy, or a title shared by several venues) show the title they were matched to.
function renderRanking(source, venueName, result, year) {
  let name = escapeHtml(venueName);
  if (result.match === "fuzzy") {
    name += ` <em title="No exact match in the ${source} data: this is the closest title, check it">≈ closest match: ${escapeHtml(result.title)}</em>`;
  } else if (result.match === "ambiguous") {
    name += ` <em title="Several venues in the ${source} data have this title: showing the most recent one">(ambiguous title)</em>`;
  }
  let rank = "NOT FOUND";
  if (result.rankings) {
    const years = Object.keys(result.rankings).map(y => parseInt(y)).sort((a, b) => a - b);
    const key = findYearKey(years, year);
    rank = key === 0 ? "older than ranking" : result.rankings[key];
  }
  return `<div style="background-color:#f1f1f1">${name}, ranking ${source}: <strong>${escapeHtml(rank)}</strong></div>`;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function rankJournalsSCIMAGO() {
  const journals = document.querySelectorAll(".article .title + a span[itemprop='isPartOf'] > span[itemprop='name']");
  journals.forEach(journal => rankJournalSCIMAGO(journal));
}

function getParentNode(element, selector) {
  const parent = element.parentNode;
  if (parent != null && parent != undefined && parent.matches(selector)) {
    return parent;
  } else {
    return getParentNode(parent, selector);
  }
}

async function rankJournalSCIMAGO(journal) {
  const container = getParentNode(journal, ".data");
  const journalLink = journal.parentElement.parentElement.getAttribute("href");
  const year = parseInt(journal.parentElement.parentElement.parentElement.querySelector("span[itemprop='datePublished']").textContent);
  addPendingCall();
  const venue = await getVenueInfo(journalLink);
  // without a full name, fall back to the (abbreviated) name shown on the page
  const name = venue.name || journal.textContent.trim();
  const result = searchScimago(name, venue.issns);
  container.insertAdjacentHTML("beforeEnd", renderRanking("SJR", name, result, year));
  removePendingCall();
}

// Returns { name, issns } for the venue (journal, conference, series) of a dblp link, e.g.
// https://dblp.org/db/journals/tcs/tcs1000.html#... -> { name: "Theoretical Computer Science", issns: ["0304-3975", "1879-2294"] }.
// Data comes from the dblp SPARQL endpoint (https://sparql.dblp.org), not from scraping dblp pages:
// all the venues requested in the same tick are resolved with a single query, and cached.
const SPARQL_ENDPOINT = "https://sparql.dblp.org/sparql";
const SPARQL_BATCH_SIZE = 200;
const NO_VENUE = { name: "", issns: [] };
const venueRequests = new Map(); // stream key (e.g. "journals/tcs") -> Promise<{name, issns}>
let venueBatch = new Map();      // stream key -> resolver, waiting for the next query

function getVenueInfo(link) {
  const m = (link || "").match(/\/db\/((?:conf|journals|series)\/[A-Za-z0-9_.+-]+)/);
  if (!m) return Promise.resolve(NO_VENUE);
  const key = m[1];
  const cacheKey = "venue2:" + key;
  if (Cache.has(cacheKey) && Cache.get(cacheKey)?.name) return Promise.resolve(Cache.get(cacheKey));
  if (!venueRequests.has(key)) {
    const request = Promise.withResolvers();
    venueRequests.set(key, request.promise);
    if (venueBatch.size === 0) setTimeout(flushVenueBatch, 0);
    venueBatch.set(key, request.resolve);
  }
  return venueRequests.get(key);
}

async function flushVenueBatch() {
  const batch = [...venueBatch.entries()];
  venueBatch = new Map();
  for (let i = 0; i < batch.length; i += SPARQL_BATCH_SIZE) {
    const chunk = batch.slice(i, i + SPARQL_BATCH_SIZE);
    let venues = {};
    try {
      venues = await fetchStreams(chunk.map(([key]) => key));
    } catch (error) {
      console.log(`DBLP Rank: SPARQL query to ${SPARQL_ENDPOINT} failed: ${error.message}`);
    }
    chunk.forEach(([key, resolve]) => {
      const venue = venues[key];
      if (venue && venue.name) {
        Cache.set("venue2:" + key, venue);
        resolve(venue);
      } else {
        venueRequests.delete(key); // allow retrying on the next run
        resolve(NO_VENUE);
      }
    });
  }
}

// Returns { "journals/tcs": { name: "Theoretical Computer Science", issns: [...] }, ... } for the given stream keys.
function fetchStreams(keys) {
  const query = `PREFIX dblp: <https://dblp.org/rdf/schema#>
SELECT ?stream (SAMPLE(?title) AS ?name) (GROUP_CONCAT(DISTINCT ?issn; separator=" ") AS ?issns) WHERE {
  VALUES ?stream { ${keys.map(k => `<https://dblp.org/streams/${k}>`).join(" ")} }
  ?stream dblp:streamTitle ?title .
  OPTIONAL { ?stream dblp:issn ?i . FILTER(STRSTARTS(STR(?i), "urn:issn:")) BIND(STRAFTER(STR(?i), "urn:issn:") AS ?issn) }
} GROUP BY ?stream`;
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "POST",
      url: SPARQL_ENDPOINT,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/sparql-results+json",
      },
      data: "query=" + encodeURIComponent(query),
      onload: res => {
        if (res.status !== 200) return reject(new Error("HTTP " + res.status));
        try {
          const venues = {};
          JSON.parse(res.responseText).results.bindings.forEach(b => {
            venues[b.stream.value.replace("https://dblp.org/streams/", "")] = {
              // drop acronyms, e.g. "International Conference on Software Engineering (ICSE)"
              name: b.name.value.replace(/\s*\([^)]*\)\s*/g, " ").trim(),
              issns: b.issns ? b.issns.value.split(" ").filter(Boolean) : [],
            };
          });
          resolve(venues);
        } catch (error) {
          reject(error);
        }
      },
      onerror: () => reject(new Error("network error")),
    });
  });
}

function findYearKey(years, year) {
  if (years[0] < year && years.length > 1) {
    key = findYearKey(years.slice(1), year)
    if (key == 0) {
      return years[0];
    } else {
      return key;
    }
  } else {
    if (years[0] > year) {
      return 0
    } else {
      return years[0]
    }
  }
}

function fetch_bin(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      responseType: "text",
      onload: res => {
        if (res.status === 200) resolve(res.response);
        else reject(new Error("HTTP " + res.status));
      },
      onerror: err => reject(err)
    });
  });
}

async function init() {
  const [core, scimago] = await Promise.all([
    fetch_bin("https://raw.githubusercontent.com/thesave/dblp_rank/refs/heads/master/data/core_binary.bin"),
    fetch_bin("https://raw.githubusercontent.com/thesave/dblp_rank/refs/heads/master/data/scimago_issn_binary.bin"),
  ]);
  buildCoreIndex(await loadData(core));
  buildScimagoIndex(await loadData(scimago));
  window.initalised.resolve();
}

// CORE data: { "title or acronym": { year: rank } }
function buildCoreIndex(data) {
  window.CORE = data;
  window.CORE_TITLES = Object.keys(data);
  window.CORE_WORDS = buildWordIndex(window.CORE_TITLES);
  window.CORE_BY_TITLE = groupBy(window.CORE_TITLES.map((t, idx) => [normaliseTitle(t), idx]));
}

// SCImago data (see data/process_data.ipynb):
// { journals: [ { t: [latest title, older titles...], i: [ISSNs, 8 chars, no dash], r: { year: categories } } ] }
function buildScimagoIndex(data) {
  const journals = data.journals;
  const lastYear = j => Math.max(...Object.keys(j.r).map(Number));
  window.SCIMAGO = journals;
  window.SCIMAGO_BY_ISSN = new Map();
  journals.forEach((j, idx) => j.i.forEach(issn => {
    const other = window.SCIMAGO_BY_ISSN.get(issn); // a handful of ISSNs belong to several journals: keep the most recent
    if (other === undefined || lastYear(journals[other]) < lastYear(j)) window.SCIMAGO_BY_ISSN.set(issn, idx);
  }));
  window.SCIMAGO_BY_TITLE = groupBy(journals.flatMap((j, idx) => [...new Set(j.t.map(normaliseTitle))].map(t => [t, idx])));
  // prefer the most recent journal when several share a title
  window.SCIMAGO_BY_TITLE.forEach(idxs => idxs.sort((a, b) => lastYear(journals[b]) - lastYear(journals[a])));
  window.SCIMAGO_WORDS = buildWordIndex(journals.map(j => j.t[0]));
}

function groupBy(pairs) {
  const map = new Map();
  pairs.forEach(([key, value]) => map.has(key) ? map.get(key).push(value) : map.set(key, [value]));
  return map;
}

// Normalises a title for exact comparison, e.g. "The Journal of X & Y (discontinued)" -> "journal of x and y"
function normaliseTitle(title) {
  return title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\(discontinued\)/g, "").replace(/&/g, " and ").replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

// Approximate title matching: weighted Jaccard similarity between the sets of words of two titles,
// where each word weighs its inverse document frequency (rare words, e.g. "blockchain", count more than
// frequent ones, e.g. "international" or "conference"). Plurals are folded ("languages" -> "language").
const FUZZY_THRESHOLD = 0.85; // tuned on all dblp journals and conferences (see the README)

function titleWords(title) {
  return [...new Set(normaliseTitle(title).split(" ").filter(Boolean)
    .map(w => w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w))];
}

function buildWordIndex(titles) {
  const docs = titles.map(titleWords);
  const postings = new Map(); // word -> indices of the titles containing it
  docs.forEach((words, idx) => words.forEach(w => postings.has(w) ? postings.get(w).push(idx) : postings.set(w, [idx])));
  const idf = w => Math.log((docs.length + 1) / ((postings.get(w)?.length || 0) + 1)) + 1;
  const weights = docs.map(words => words.reduce((sum, w) => sum + idf(w), 0));
  return { postings, idf, weights };
}

// Index of the title most similar to the query, if its similarity is at least FUZZY_THRESHOLD, or -1.
function fuzzySearch(index, query) {
  const words = titleWords(query);
  const queryWeight = words.reduce((sum, w) => sum + index.idf(w), 0);
  const shared = new Map(); // title index -> weight of the words it shares with the query
  words.forEach(w => (index.postings.get(w) || []).forEach(idx => shared.set(idx, (shared.get(idx) || 0) + index.idf(w))));
  let best = -1, bestScore = 0;
  shared.forEach((weight, idx) => {
    const score = weight / (queryWeight + index.weights[idx] - weight);
    if (score > bestScore) { best = idx; bestScore = score; }
  });
  return bestScore >= FUZZY_THRESHOLD ? best : -1;
}

// Matching strategy, from most to least reliable: ISSN, exact (normalised) title, fuzzy title.
// The result says how it was found ("issn", "title", "ambiguous", "fuzzy"), so that approximate matches can be flagged.
function searchScimago(name, issns = []) {
  const found = (idx, match) => ({ title: window.SCIMAGO[idx].t[0], rankings: window.SCIMAGO[idx].r, match });
  for (const issn of issns) {
    const idx = window.SCIMAGO_BY_ISSN.get(issn.replace(/[^0-9X]/gi, "").toUpperCase());
    if (idx !== undefined) return found(idx, "issn");
  }
  const sameTitle = window.SCIMAGO_BY_TITLE.get(normaliseTitle(name));
  if (sameTitle) return found(sameTitle[0], sameTitle.length > 1 ? "ambiguous" : "title");
  // A journal with ISSNs, none of which is in SCImago, is (almost always) not ranked:
  // fuzzy matching would only find similarly-named journals. Use it only when dblp gives no ISSN.
  if (issns.length > 0) return { title: name };
  const idx = fuzzySearch(window.SCIMAGO_WORDS, name);
  return idx >= 0 ? found(idx, "fuzzy") : { title: name };
}

function searchCoreFullName(name) {
  const found = (idx, match) => ({ title: window.CORE_TITLES[idx], rankings: window.CORE[window.CORE_TITLES[idx]], match });
  const sameTitle = window.CORE_BY_TITLE.get(normaliseTitle(name));
  if (sameTitle) return found(sameTitle[0], "title");
  const idx = fuzzySearch(window.CORE_WORDS, name);
  return idx >= 0 ? found(idx, "fuzzy") : { title: name };
}

function searchCoreAcronym(query) {
  const ql = query.toLowerCase();
  const exact = window.CORE_TITLES.filter(t => t.toLowerCase() === ql);
  if (exact.length > 0) {
    return { title: exact[0], rankings: window.CORE[exact[0]] }
  } else {
    return { title: query }
  }
}

function loadData(b64) {
  return new Promise((resolve, reject) => {
    const binary = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    fflate.decompress(binary, (err, result) => {
      if (err) reject(err);
      else resolve(JSON.parse(fflate.strFromU8(result)));
    });
  });
}

// Caching logic
const Cache = {
  set(key, value) {
    const entry = { value: value };
    GM_setValue(key, JSON.stringify(entry));
  },

  get(key) {
    const raw = GM_getValue(key, null);
    const entry = JSON.parse(raw);
    return entry.value;
  },

  has(key) {
    const raw = GM_getValue(key, null);
    if (!raw) return false;
    try {
      const content = JSON.parse(raw);
      return true;
    } catch {
      return false;
    }
  }
};

function clearCache() {
  GM_listValues().forEach(key => GM_deleteValue(key));
  alert('Cache cleared.');
}

// Promise.all([window.CORE_promise.promise, window.SCIMAGO_promise.promise])
//         .then(() => document.querySelector("#pending-calls-item").remove());
