// ==UserScript==
// @name         DecronymLive
// @namespace    https://oskark.pl/
// @version      1.0
// @description  Userscript which shows meanings of acronyms on Reddit
// @author       oskark
// @run-at       document-end
// @match        *://*.reddit.com/r/spacex/comments*
// @match        *://*.reddit.com/r/SpaceXLounge/comments*
// @match        *://*.reddit.com/r/SpaceXMasterrace/comments*
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      https://cdn.rawgit.com/showdownjs/showdown/1.8.6/dist/showdown.min.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @resource     spacex http://decronym.xyz/acronyms/SpaceX.json
// @resource     css style.css
// ==/UserScript==

$('body').prepend('<div class="decronymInfo"><p></p></div>');
$('head').append('<style>' + `
.decronym {
    background: hsla(203, 67%, 90%, 1);
    padding: 1px 3px;
    margin: -1px -2px;
    transition: background color 0.2s;
    border-radius: 2px;
    cursor: pointer;
    display: inline-block;
}

.decronym:hover {
    background: #2276AB;
    color: #fcfcfc;
}

.wrap1 {
    position: relative;
    display: inline-block;
}

.decronym .wrap2 {
    position: absolute;
    opacity: 0;
    transition: 0.2s opacity;
    pointer-events: none;
    display: flex;
    flex-direction: column;
    width: 350px;
    margin-left: -3px;
    bottom: 19px;
}

.decronym:hover .wrap2 {
    opacity: 1;
    pointer-events: all;
}

.decronym .meaning {
    background: #2276AB;
    position: static;
    padding: 2px 8px;
    border-radius: 2px;
    color: #fcfcfc;
    margin-top: 5px;
}

body .comment .entry {
    margin-left: 32px;
    overflow: visible;
}

.decronym a {
    color: #fcfcfc;
    text-decoration: underline;
}

.decronymInfo {
    position: fixed;
    transition: 1s opacity;
    opacity: 0;
    pointer-events: none;
    left: 0;
    right: 0;
    bottom: 10px;
    z-index: 10;
    text-align: center;
}

.decronymInfo.active {
    transition: 0s opacity;
    opacity: 1;
}

.decronymInfo p {
    background: #2276AB;
    padding: 4px 8px;
    border-radius: 2px;
    color: #fcfcfc;
    font-size: 10px;
    display: inline-block;
}
` + '</style>');

var converter = new showdown.Converter();
// word is defined as series of alphanumeric chars, hyphens and slashes, followed by series of any other 'non-word' chars
var wordExp = /^[\w\-\/]+/;
var nonWordExp = /^[^\w\-\/]+/;
var acronymsCount = 0, meaningsCount = 0;
var acronymsList;

setTimeout( function(){
	decronymMessage('starting DecronymLive...');
	setTimeout(function(){ decronym(); }, 300);
}, 500 );

function decronymMessage(message) {
	$('.decronymInfo p').html(message);
	$('.decronymInfo').addClass('active');
	setTimeout(function(){ $('.decronymInfo').removeClass('active'); }, 3000);
}

function decronym() {
	var startTime = Date.now();
	// allComments is not really comments, it's every <p> in every comment
	var allComments = $('.comment .usertext-body > div > p');
	getAcronymsList();  // load acronyms from decronym's website

	for(var y = 0; y < (allComments.length); y++) {
		var comment = $(allComments[y]).html();
		var commentWords = splitWords(comment);
		comment = findAcronymsInsertMeanings(commentWords);
		$(allComments[y]).html(comment);
	}

	var timeItTook = Date.now()-startTime;
	decronymMessage('found ' + acronymsCount + ' acronyms and inserted ' + meaningsCount + ' meanings in ' + timeItTook + ' ms');
}

function getAcronymsList() {
	var acronymsString = GM_getResourceText('spacex');
	acronymsList = JSON.parse(acronymsString);
}

function splitWords(comment) {
	// array of [word, non-word] arrays
	var commentWords = [];
	for(var i=0; comment!=''; i++) {
		var matchNonWord = comment.match(nonWordExp);
		var matchWord;
		if(matchNonWord != null) {
			// if comment begins with 'non-word'
			commentWords[i] = ['', matchNonWord];
			comment = comment.replace(nonWordExp,'');
		} else {
			// if comment begins with 'word'
			matchWord = comment.match(wordExp);
			comment = comment.replace(wordExp,'');
			matchNonWord = comment.match(nonWordExp);
			if(matchNonWord == null) matchNonWord = '';
			comment = comment.replace(nonWordExp,'');
			commentWords[i] = [matchWord, matchNonWord];
		}
	}
	return commentWords;
}

function findAcronymsInsertMeanings(commentWords) {
	var wordString;
	var nonWordString;
	var comment = '';

	for(var z in commentWords) {
		wordString = new String(commentWords[z][0]);
		nonWordString = new String(commentWords[z][1]);

		// filter out lowercase and 1-char words for performance
		if( /[A-Z]/.test(wordString) && wordString.length > 1 ) {
			for(var acronym in acronymsList) {
				if( acronym == wordString ) {
					acronymsCount++;
					wordString = '<span class="decronym"><div class="wrap1"><div class="wrap2">';
					for(var meaning in acronymsList[acronym]) {
						meaningsCount++;
						wordString += '<div class="meaning">' + converter.makeHtml(acronymsList[acronym][meaning]) + '</div>';
					}
					wordString += '</div></div>' + acronym + '</span>';
					break;
				}
			}
		}
		comment += wordString + nonWordString;
	}
	return comment;
}
