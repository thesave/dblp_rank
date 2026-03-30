// ==UserScript==
// @name            Rank DBLP
// @namespace       https://github.com/thesave
// @description     Add ranking of conferences (from iCORE 2008, 2013, 2014, 2017, 2018, 2020, 2021, 2023, and 2026) and journal (from SCIMAGO 1999-2025) to a DBLP researcher's page
// @version         0.8.1
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
// @connect         githubusercontent.com
// @request         https://code.jquery.com/jquery-3.3.1.min.js
// @require         https://unpkg.com/fflate@0.8.2/umd/index.js
// @require         https://cdn.jsdelivr.net/npm/@leeoniya/ufuzzy@1.0.19/dist/uFuzzy.iife.min.js
// @updateURL       https://openuserjs.org/meta/thesave/Rank_DBLP.meta.js
// @downloadURL     https://openuserjs.org/install/thesave/Rank_DBLP.user.js
// ==/UserScript==]


(function () {
	'use strict';
	const button = "<li id=\"stars_button\" style=\"display:inline-block;cursor:pointer;\"><div class=\"head\" bis_skin_checked=\"1\"><svg aria-hidden=\"true\" focusable=\"false\" data-prefix=\"fas\" data-icon=\"star\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 576 512\" class=\"svg-inline--fa fa-star fa-w-18 fa-3x\" style=\"color:f1f1f1;margin-top:-2px;width: 18px;\"><path fill=\"currentColor\" d=\"M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z\" class=\"\"></path></svg></div></li>";
	$("#main > header > nav > ul").append(button);
	$("#completesearch-publs > header > nav > ul > li").append(button);
	$("#stars_button").click(function () { removeInformal(); });
})();