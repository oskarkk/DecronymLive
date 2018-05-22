// ==UserScript==
// @name         DecronymLive
// @namespace    https://oskark.pl/
// @version      1.2
// @description  Userscript which shows meanings of acronyms on Reddit
// @updateURL    https://github.com/oskarkk/DecronymLive/raw/master/main.user.js
// @downloadURL  https://github.com/oskarkk/DecronymLive/raw/master/main.user.js
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

(function() {

$('body').prepend('<div class="decronymInfo"><p></p></div>');
$('head').append('<style>' + GM_getResourceText('css') + '</style>');

var converter = new showdown.Converter();
// word is defined as series of alphanumeric chars, hyphens and slashes, followed by series of any other 'non-word' chars
var wordExp = /^[\w\-\/]+/;
var nonWordExp = /^[^\w\-\/]+/;
var acronymsCount = 0, meaningsCount = 0;
var acronymsList;

// timeouts to display messages somewhat correctly
setTimeout( function(){
	decronymMessage('starting DecronymLive...');
	setTimeout(function(){ decronym(); }, 300);
}, 500 );

function decronymMessage(message) {
	$('.decronymInfo p').html(message);
	$('.decronymInfo').addClass('active'); // show message
	setTimeout(function(){ $('.decronymInfo').removeClass('active'); }, 3000); // slowly hide after 3s
}

function decronym() {
	var startTime = Date.now();
	// allComments is not really comments, it's every <p> in every comment
	var allComments = $('.comment .usertext-body > div > p');
	var allCommentsNumber = allComments.length;
	getAcronymsList();  // load acronyms from Decronym's website

	// find acronyms and insert meanings one comment at a time
	for(var y = 0; y < allCommentsNumber; y++) {
		var comment = $(allComments[y]).html();
		var commentWords = splitToWords(comment);
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

// TODO: can be optimized
function splitToWords(comment) {
	// array of [word, non-word] arrays
	var commentWords = [];
	// every loop cuts one word from the comment
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
					// insert every meaning before the acronym
					for(var meaning in acronymsList[acronym]) {
						meaningsCount++;
						var meaningHtml = converter.makeHtml(acronymsList[acronym][meaning]);
						wordString += '<div class="meaning">' + meaningHtml + '</div>';
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

})();
