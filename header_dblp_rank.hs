// ==UserScript==
// @name            Rank DBLP
// @namespace       https://github.com/thesave
// @description     Add ranking of conferences (from iCORE 2008, 2013, 2014, 2017, 2018, 2020, 2021, 2023, and 2026) and journal (from SCIMAGO 1999-2025) to a DBLP researcher's page
// @version         0.9
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
})();