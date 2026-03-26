function removeInformal() {
  window.initalised = Promise.withResolvers();
  init();
  $("#show-informal").trigger("click");
  setTimeout(openMore, 250);
}

function openMore() {
  var moreButton = $("div.refine-by.venue >  ul.more-options");
  if ($(moreButton).is(":visible")) {
    $(moreButton).find("li > button").trigger("click");
    setTimeout(function () { openMore() }, 250);
  } else {
    window.initalised.promise.then(() => {
      rankConferencesGRIN();
      rankJournalsSCIMAGO();
    })
  }
}

function rankConferencesGRIN() {
  const venues = document.querySelectorAll(".inproceedings .title + a");
  venues.forEach(venueItem => rankConferenceGRIN(venueItem));
}

function rankConferenceGRIN(venueItem) {
  const _venueItem = venueItem;
  const venueAcronym = venueItem.textContent.replace(/\d+/g, "").replace(/\(.*\)/g, "").trim();
  const addToElement = (text) => { _venueItem.parentNode.insertAdjacentHTML("beforeEnd", text); };
  const handleResult = ( result  => {
    // console.log(result);
    if( result.hasOwnProperty( "rankings" ) ){
      const year = parseInt(_venueItem.querySelector("span[itemprop='datePublished']").textContent.trim());
      const years = Object.keys(result.rankings).map(y => parseInt(y)).sort((a, b) => a - b);
      const key = findYearKey(years, year);
      if (key === 0) {
         addToElement( "<div style=\"background-color:#f1f1f1\">" + result.title + ", ranking CORE: <strong>older than ranking</strong></div>" );
      } else {
        addToElement( "<div style=\"background-color:#f1f1f1\">" + result.title + ", ranking CORE: <strong>  " + result.rankings[key] + "</strong></div>" );
      }
    } else {
      addToElement( "<div style=\"background-color:#f1f1f1\">" + result.title + ", ranking CORE: <strong>  NOT FOUND </strong></div>" );
    }
  });
  const result = searchCoreAcronym(venueAcronym);
  if ( result.hasOwnProperty( "rankings" ) ) {
    handleResult(result);
  } else {
    fetchConferenceName(venueItem.getAttribute("href")).then(venueName => {
      if (venueName === "") {
        handleResult(result);
      } else {
        handleResult(searchCoreFullName(venueName));
      }
    });
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

function rankJournalSCIMAGO(journal) {
  const _journal = journal;
  const addToElement = ( text ) => { getParentNode(_journal, ".data").insertAdjacentHTML("beforeEnd", text); };
  const journalLink = journal.parentElement.parentElement.getAttribute("href");
  GM_xmlhttpRequest({
    method: "GET",
    url: journalLink,
    onload: function (response) {
      const ownerDocument = document.implementation.createHTMLDocument('virtual');
      const journalItem = $(response.responseText, ownerDocument).find("#breadcrumbs > ul > li > span:nth-child(3) > a > span").text().trim();
      result = searchScimago(journalItem);
      if ( result.hasOwnProperty( "rankings" ) ){
        const year = parseInt(journal.parentElement.parentElement.parentElement.querySelector("span[itemprop='datePublished']").textContent);
        const years = Object.keys(result.rankings).map(y => parseInt(y)).sort((a, b) => a - b);
        key = findYearKey(years, year)
        if (key === 0) {
          addToElement( "<div style=\"background-color:#f1f1f1\">" + journalItem + ", ranking SJR: <strong> older than ranking</strong></div>" );
        } else {
          addToElement( "<div style=\"background-color:#f1f1f1\">" + journalItem + ", ranking SJR: <strong>  " + result.rankings[key] + "</strong></div>" );
        }
      } else {
          addToElement( "<div style=\"background-color:#f1f1f1\">" + journalItem + ", ranking SJR <strong> NOT FOUND </strong></div>" );
      }
    }
  });
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
  // console.log( `search core acronym ${query}` );
  const ql = query.toLowerCase();
  const exact = window.CORE_TITLES.filter(t => t.toLowerCase() === ql);
  if (exact.length > 0) {
    return { title: exact[0], rankings: window.CORE[exact[0]] }
  } else {
    return { title: query }
  }
}

function searchCoreFullName(query) {
  // console.log( `search core full name ${query}` );
  return searchInDataset(query, window.CORE, window.CORE_TITLES, window.CORE_TITLES_LC, window.uf);
}

function searchScimago(query) {
  // console.log( `search scimago ${query}` );
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