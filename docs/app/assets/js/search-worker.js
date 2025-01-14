'use strict';

/* eslint-env worker */
/* global importScripts, lunr */

// Load up the lunr library
importScripts('../components/lunr-0.7.2/lunr.min.js');

// Escapes any special characters in a string to be used as a regular expression.
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Create the lunr index - the docs should be an array of object, each object containing
// the path and search terms for a page
var index = lunr(/** @this */function() {
  this.ref('path');
  this.field('titleWords', {boost: 50});
  this.field('members', {boost: 40});
  this.field('keywords', {boost: 20});
});

// Retrieve the searchData which contains the information about each page to be indexed
var searchData = {};
var searchDataRequest = new XMLHttpRequest();
searchDataRequest.onload = function() {

  // Store the pages data to be used in mapping query results back to pages
  searchData = JSON.parse(this.responseText);
  // Add search terms from each page to the search index
  searchData.forEach(function(page) {
    index.add(page);
  });
  self.postMessage({e: 'index-ready'});
};
searchDataRequest.open('GET', 'search-data.json');
searchDataRequest.send();

// The worker receives a message everytime the web app wants to query the index
self.onmessage = function(oEvent) {
  var q = oEvent.data.q;
  var safeQ = escapeRegExp(q);
  var hits = index.search(safeQ);
  var results = [];
  // Only return the array of paths to pages
  hits.forEach(function(hit) {
    results.push(hit.ref);
  });
  // The results of the query are sent back to the web app via a new message
  self.postMessage({e: 'query-ready', q: q, d: results});
};
