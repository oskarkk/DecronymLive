// ==UserScript==
// @name         DecronymLive
// @namespace    https://oskark.pl/
// @version      1.3
// @description  Userscript which shows meanings of acronyms on Reddit
// @updateURL    https://github.com/oskarkk/DecronymLive/raw/master/main.user.js
// @downloadURL  https://github.com/oskarkk/DecronymLive/raw/master/main.user.js
// @author       oskark
// @run-at       document-end
// @match        *://*.reddit.com/r/spacex/comments*
// @match        *://*.reddit.com/r/SpaceXLounge/comments*
// @match        *://*.reddit.com/r/SpaceXMasterrace/comments*
// @grant        GM_getResourceText
// @require      https://cdn.rawgit.com/showdownjs/showdown/1.8.6/dist/showdown.min.js
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js
// @resource     spacex http://decronym.xyz/acronyms/SpaceX.json
// @resource     css style.css
// ==/UserScript==

(function() {

// word in comment is defined as:
const wordExp = /^[\w\-\/]+/; // series of alphanumeric chars, hyphens and slashes
const nonWordExp = /^[^\w\-\/]+/; // followed by series of any other 'non-word' chars

var converter = new showdown.Converter(); // Markdown parser
var acronymsCount = 0, meaningsCount = 0;
var acronymsList;

$('body').prepend('<div class="decronymInfo"><p></p></div>');
$('head').append('<style>' + GM_getResourceText('css') + '</style>');
decronymMessage('starting DecronymLive...', decronym);

function decronymMessage(message, callback) {
	$('.decronymInfo p').html(message);
	$('.decronymInfo').addClass('active');        // show message
	setTimeout(function() {                       // give browser the time to show the element
		$('.decronymInfo').removeClass('active'); // start hiding message after 1s (see CSS)
		if (callback) callback();
	}, 100);
}

function decronym() {
	// allComments is not really comments, it's every <p> in every comment
	var allComments = $('.comment .usertext-body > div > p');
	var allCommentsNumber = allComments.length;
	getAcronymsList();  // load acronyms from Decronym's website
	var startTime = Date.now();

	// find acronyms and insert meanings one comment at a time
	for(let i = 0; i < allCommentsNumber; i++) {
		var comment = {
			content: $(allComments[i]).html(),
			words: []
		};
		splitToWords(comment);
		findAcronymsInsertMeanings(comment);
		mergeWords(comment);
		$(allComments[i]).html(comment.content);
	}
	var endTime = Date.now();
	var timeItTook = endTime-startTime;
	var message = 'found '  + acronymsCount + ' acronyms and inserted '
							+ meaningsCount + ' meanings in '
							+ timeItTook + ' ms';
	decronymMessage(message);
}

function getAcronymsList() {
	var acronymsString = GM_getResourceText('spacex');
	acronymsList = JSON.parse(acronymsString);
}

function splitToWords(comment) {
	// every loop cuts one word from the comment
	for(let i=0; comment.content!=''; i++) {
		var matchNonWord;
		var matchWord;
		matchNonWord = cutFromComment(comment, nonWordExp);
		if(matchNonWord != null) {
			// if comment begins with 'non-word'
			matchWord = '';
		} else {
			// if comment begins with 'word'
			matchWord = cutFromComment(comment, wordExp);
			matchNonWord = cutFromComment(comment, nonWordExp);
			if(matchNonWord == null) matchNonWord = '';
		}
		// array of [word, non-word] arrays
		comment.words[i] = [matchWord, matchNonWord];
		//alert(comment.content);
	}
}

function cutFromComment(comment,exp) {
	var cut;
	comment.content = comment.content.replace(exp, function(match) {
		cut = match;
		return '';
	} );
	return cut;
}

function mergeWords(comment) {
	comment.content = '';
	for(let i in comment.words) {
		comment.content += comment.words[i][0] + comment.words[i][1]
	}
}

function findAcronymsInsertMeanings(comment) {
	for(let i in comment.words) {
		var wordString = new String(comment.words[i][0]);

		// filter out lowercase and 1-char words for performance
		if( !/[A-Z]/.test(wordString) || wordString.length < 2 ) {
			continue;
		}

		if(wordString in acronymsList) {
			acronymsCount++;
			comment.words[i][0] = '<span class="decronym"><div class="wrap1"><div class="wrap2">';
			// insert every meaning before the acronym
			for(var meaning in acronymsList[wordString]) {
				meaningsCount++;
				var meaningHtml = converter.makeHtml(acronymsList[wordString][meaning]);
				comment.words[i][0] += '<div class="meaning">' + meaningHtml + '</div>';
			}
			comment.words[i][0] += '</div></div>' + wordString + '</span>';
		}
	}
}

})();
