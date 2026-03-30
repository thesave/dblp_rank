// ==UserScript==
// @name            Rank DBLP
// @namespace       https://github.com/thesave
// @description     Add ranking of conferences (from iCORE 2008, 2013, 2014, 2017, 2018, 2020, 2021, 2023, and 2026) and journal (from SCIMAGO 1999-2025) to a DBLP researcher's page
// @version         0.9.1
// @license         MIT
// @copyright       2018+
// @icon            https://dblp.uni-trier.de/img/favicon.ico
// @author          thesave
// @include         https://dblp.uni-trier.de/pers/*
// @include         https://dblp.uni-trier.de/search*
// @include         https://dblp.uni-trier.de/pid/*
// @include         https://dblp.org/pers/*
// @include         https://dblp.org/pid/*
// @include         https://dblp.dagstuhl.de/*
// @include         https://dblp1.uni-trier.de/*
// @grant           GM_xmlhttpRequest
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_deleteValue
// @connect         githubusercontent.com
// @request         https://code.jquery.com/jquery-3.3.1.min.js
// @require         https://unpkg.com/fflate@0.8.2/umd/index.js
// @require         https://cdn.jsdelivr.net/npm/@leeoniya/ufuzzy@1.0.19/dist/uFuzzy.iife.min.js
// @updateURL       https://openuserjs.org/meta/thesave/Rank_DBLP.meta.js
// @downloadURL     https://openuserjs.org/install/thesave/Rank_DBLP.user.js
// ==/UserScript==]


(function () {
	'use strict';
	const star_button = "<li class=\"drop-down\" id=\"stars_button\" style=\"display:inline-block;cursor:pointer;\"><div class=\"head\"><svg aria-hidden=\"false\" focusable=\"true\" data-prefix=\"fas\" data-icon=\"star\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 576 512\" class=\"svg-inline--fa fa-star fa-w-18 fa-3x\" style=\"color:f1f1f1;margin-top:-2px;width: 18px;\"><path fill=\"currentColor\" d=\"M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z\" class=\"\"></path></svg></div><div class=\"body\">Run DBLP Rank</div></li>";
	$("#main > header > nav > ul").append(star_button);
	const erase_button = "<li class=\"drop-down\" id=\"clear_cache\" style=\"display:inline-block;cursor:pointer;\"><div class=\"head\"><svg aria-hidden=\"false\" focusable=\"true\" data-prefix=\"fas\" data-icon=\"eraser\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 576 512\" class=\"svg-inline--fa fa-eraser fa-w-18 fa-3x\" style=\"color:f1f1f1;margin-left:2px;margin-top:-2px;width: 18px;\"><path fill=\"rgb(255, 255, 255)\" d=\"M210.5 480L333.5 480L398.8 414.7L225.3 241.2L98.6 367.9L210.6 479.9zM256 544L210.5 544C193.5 544 177.2 537.3 165.2 525.3L49 409C38.1 398.1 32 383.4 32 368C32 352.6 38.1 337.9 49 327L295 81C305.9 70.1 320.6 64 336 64C351.4 64 366.1 70.1 377 81L559 263C569.9 273.9 576 288.6 576 304C576 319.4 569.9 334.1 559 345L424 480L544 480C561.7 480 576 494.3 576 512C576 529.7 561.7 544 544 544L256 544z\"/></svg></div><div class=\"body\">Erase DBLP Rank Cache</div></li>";
	document.querySelector("#stars_button").parentNode.insertAdjacentHTML("beforeEnd", erase_button);
	$("#stars_button").click(function () { removeInformal(); });
	$("#clear_cache").click(function () { clearCache(); });
})();function removeInformal() {
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
  const _venueItem = venueItem;
  const venueAcronym = venueItem.textContent.replace(/\d+/g, "").replace(/\(.*\)/g, "").trim();
  const addToElement = (text) => { _venueItem.parentNode.insertAdjacentHTML("beforeEnd", text); };
  const handleResult = (result => {
    // console.log(result);
    if (result.hasOwnProperty("rankings")) {
      const year = parseInt(_venueItem.querySelector("span[itemprop='datePublished']").textContent.trim());
      const years = Object.keys(result.rankings).map(y => parseInt(y)).sort((a, b) => a - b);
      const key = findYearKey(years, year);
      if (key === 0) {
        addToElement("<div style=\"background-color:#f1f1f1\">" + result.title + ", ranking CORE: <strong>older than ranking</strong></div>");
      } else {
        addToElement("<div style=\"background-color:#f1f1f1\">" + result.title + ", ranking CORE: <strong>  " + result.rankings[key] + "</strong></div>");
      }
    } else {
      addToElement("<div style=\"background-color:#f1f1f1\">" + result.title + ", ranking CORE: <strong>  NOT FOUND </strong></div>");
    }
  });
  const result = searchCoreAcronym(venueAcronym);
  if (result.hasOwnProperty("rankings")) {
    handleResult(result);
  } else {
    let venueName = null;
    const venueLink = venueItem.getAttribute("href");
    if (Cache.has(venueLink)) {
      venueName = Cache.get(venueLink)
    } else {
      addPendingCall();
      venueName = await window.scheduler.add(() => fetchConferenceName(venueLink));
      Cache.set(venueLink, venueName);
      removePendingCall();
    }
    if (venueName == null || venueName == undefined || venueName === "") {
      handleResult(result);
    } else {
      handleResult(searchCoreFullName(venueName));
    }
  }
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
  const _journal = journal;
  const addToElement = (text) => { getParentNode(_journal, ".data").insertAdjacentHTML("beforeEnd", text); };
  const journalLink = journal.parentElement.parentElement.getAttribute("href");
  const search = Promise.withResolvers();
  addPendingCall();
  const handleResponse = (journalItem) => {
    result = searchScimago(journalItem);
    if (result.hasOwnProperty("rankings")) {
      const year = parseInt(journal.parentElement.parentElement.parentElement.querySelector("span[itemprop='datePublished']").textContent);
      const years = Object.keys(result.rankings).map(y => parseInt(y)).sort((a, b) => a - b);
      key = findYearKey(years, year);
      if (key === 0) {
        addToElement("<div style=\"background-color:#f1f1f1\">" + journalItem + ", ranking SJR: <strong> older than ranking</strong></div>");
      } else {
        addToElement("<div style=\"background-color:#f1f1f1\">" + journalItem + ", ranking SJR: <strong>  " + result.rankings[key] + "</strong></div>");
      }
    } else {
      addToElement("<div style=\"background-color:#f1f1f1\">" + journalItem + ", ranking SJR <strong> NOT FOUND </strong></div>");
    }
    removePendingCall();
    search.resolve();
  }
  if (Cache.has(journalLink)) {
    handleResponse(Cache.get(journalLink));
  } else {
    window.scheduler.add(() => new Promise((resolve) => GM_xmlhttpRequest({
      method: "GET",
      url: journalLink,
      onload: (response) => {
        const ownerDocument = document.implementation.createHTMLDocument('virtual');
        const journalItem = $(response.responseText, ownerDocument).find("#breadcrumbs > ul > li > span:nth-child(3) > a > span").text().trim();
        Cache.set(journalLink, journalItem);
        handleResponse(journalItem);
        resolve();
      }
    })));
  }
  return search.promise;
}

async function fetchHeadline(url) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: res => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(res.responseText, "text/html");
        const h1 = doc.querySelector("#headline h1");
        resolve(h1 ? h1.textContent.replace(/\s*\([^)]*\)\s*/g, ' ').trim() : null);
      },
      onerror: reject
    });
  });
}

async function fetchConferenceName(url) {
  try {
    url = url.match(/(https?:\/\/[^/]+\/db\/conf\/[^/]+)/)[1];
    return fetchHeadline(url);
  } catch (error) {
    console.log(`Could not fetch url:${url}`);
    return Promise.resolve("");
  }
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
  window.scheduler = new RequestScheduler({ delay: 1000, concurrency: 1 });
  const [core, scimago] = await Promise.all([
    fetch_bin("https://raw.githubusercontent.com/thesave/dblp_rank/refs/heads/master/data/core_binary.bin"),
    fetch_bin("https://raw.githubusercontent.com/thesave/dblp_rank/refs/heads/master/data/scimago_binary.bin"),
  ]);

  window.SCIMAGO = await loadData(scimago);
  window.CORE = await loadData(core);

  window.CORE_TITLES = Object.keys(window.CORE);
  window.SCIMAGO_TITLES = Object.keys(window.SCIMAGO);

  window.CORE_TITLES_LC = window.CORE_TITLES.map(t => t.toLowerCase());
  window.SCIMAGO_TITLES_LC = window.SCIMAGO_TITLES.map(t => t.toLowerCase());

  window.uf = new uFuzzy({ intraMode: 1 });
  window.uf_strict = new uFuzzy({ intraMode: 0 });
  window.initalised.resolve();
}

function searchInDataset(query, dataset, dataset_titles, dataset_titles_lc, uf) {
  const [idxs, info, order] = uf.search(dataset_titles_lc, query);
  if (idxs === null || idxs.length == 0) return { title: query };
  const title = dataset_titles[idxs[order.indexOf(0)]];
  return { title, rankings: dataset[title] };
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

function searchCoreFullName(query) {
  return searchInDataset(query, window.CORE, window.CORE_TITLES, window.CORE_TITLES_LC, window.uf);
}

function searchScimago(query) {
  return searchInDataset(query, window.SCIMAGO, window.SCIMAGO_TITLES, window.SCIMAGO_TITLES_LC, window.uf);
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

// Scheduler's logic
class RequestScheduler {
  constructor({ delay = 300, concurrency = 3 } = {}) {
    this.delay = delay;             // ms between each dequeue
    this.concurrency = concurrency; // max simultaneous concurrent requests
    this.queue = [];
    this.active = 0;
    this.timer = null;
  }

  add(thunk) {
    return new Promise((resolve, reject) => {
      this.queue.push({ thunk, resolve, reject });
      this._schedule();
    });
  }

  _schedule() {
    if (this.timer) return;
    this.timer = setInterval(() => this._tick(), this.delay);
  }

  _tick() {
    if (this.queue.length === 0) {
      clearInterval(this.timer);
      this.timer = null;
      return;
    }
    if (this.active >= this.concurrency) return;

    const { thunk, resolve, reject } = this.queue.shift();
    this.active++;
    thunk()
      .then(resolve)
      .catch(reject)
      .finally(() => { this.active--; });
  }
}