// ==UserScript==
// @name         Wizard101: Easier Trivia
// @namespace    https://github.com/Jan-Fcloud/W101-TriviaAnswers
// @version      1.0
// @description  Highlights the correct Wizard101 trivia answer and speeds up the quiz UI (instant answers/next button)
// @author       Jan-FCloud & Zalatos (original), KritDaMage (trivia list expansion & rework)
// @match        https://www.wizard101.com/quiz/trivia/game*
// @match        https://www.wizard101.com/game/trivia
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// ==/UserScript==

/* global jQuery, selectQuizAnswer */
(function () {
    'use strict';

    let triviaPages = [
        "https://www.wizard101.com/quiz/trivia/game/english-trivia",
        "https://www.wizard101.com/quiz/trivia/game/kingsisle-trivia",
        "https://www.wizard101.com/quiz/trivia/game/educational-trivia",
        "https://www.wizard101.com/quiz/trivia/game/fun-trivia",
        "https://www.wizard101.com/game/trivia"
    ];

    // ---------- Filter Trivia List ----------
    // (on the overview pages, replace each category's 2-sample preview with
    // its full quiz list, then move quizzes we have answers for to the front
    // and highlight them)

    let expandTriviaCategories = (data) => {
        $(".darkerparchment_header").each(function (index, headerElement) {
            let content = $(headerElement).next(".darkerparchment_content");
            let viewAllUrl = content.find("p a").attr("href");
            if (!viewAllUrl) return;

            $.get(viewAllUrl, function (html) {
                let doc = new DOMParser().parseFromString(html, "text/html");
                // Keep the enclosing <li> (not just the inner .contentbox) so
                // its "notake" class survives - that's what drives the site's
                // own "Take Again Tomorrow!" ribbon and image graying via CSS.
                let quizBoxes = $(doc).find("article > div.contentbox").closest("li");
                let container = content.find("td.darkerparchment_pattern");
                container.empty().append(quizBoxes);

                // Lay quizzes out two per row instead of stacking full-width.
                quizBoxes.css({
                    display: "inline-block",
                    width: "47%",
                    margin: "0 1% 10px 1%",
                    "vertical-align": "top"
                });

                // Quizzes already completed today link to "#" - don't let
                // that jump/scroll the page.
                quizBoxes.find('a[href="#"]').on("click", (evt) => evt.preventDefault());

                let answeredBoxes = quizBoxes.filter(function () {
                    let title = $(this).find(".darkerparchment_header h2").text().replace("Trivia", "").trim();
                    return !!data[title];
                });

                answeredBoxes.find(".darkerparchment_header h2").css("color", "green").css("font-weight", "bold");
                answeredBoxes.prependTo(container);
            });
        });
    };

    // ---------- Speedy Wizard101 Quiz ----------
    // (instant UI, click-anywhere-in-answer-box selection)

    console.debug("Wizard101: Easier Trivia active");

    // Revise the fadeIn animation so answers appear instantly, and style the
    // answer boxes so the whole box looks/behaves clickable.
    let styleEle = document.createElement("style");
    styleEle.innerHTML =
        ".fadeIn { animation: fadeIn 0s ease-out !important }" +
        " div.answer.fadeIn:hover { background-color: #bb9461; color: #000; }" +
        " div.answer.fadeIn { cursor: pointer; border-radius: 5px; margin:auto; padding: 10px 0 10px 25px }";
    document.getElementsByTagName("head")[0].appendChild(styleEle);

    let quizEnhancer = () => {
        // Show answers and buttons immediately instead of waiting on the fade-in.
        jQuery(".answer").css("visibility", "visible").addClass("fadeIn");
        jQuery("button").css("visibility", "visible");
        jQuery("#nextQuestion").addClass("kiaccountsbuttongreen");

        // Make clicking anywhere in the answer box select it, not just the checkbox.
        jQuery(".answer").click((evt) => {
            let link = jQuery(evt.currentTarget).find('.largecheckbox').get(0) ||
                       jQuery(evt.currentTarget).find('.largecheckboxselected').get(0);
            selectQuizAnswer(link);
        });
    };
    jQuery(quizEnhancer);

    // Override the site's built-in answer-selection function so only one
    // answer in a question can be checked at a time.
    window.selectQuizAnswer = function (selectedCheckbox) {
        if (localStorage.getItem("selectionInProgress") === "false") {
            localStorage.setItem("selectionInProgress", true);
            let boxes = document.querySelectorAll(".answerBox");
            for (let i = 0; i < boxes.length; i++) {
                if (boxes[i].children[0] === selectedCheckbox) {
                    boxes[i].children[0].className = "largecheckboxselected";
                    boxes[i].children[1].checked = "checked";
                } else {
                    boxes[i].children[0].className = "largecheckbox";
                    boxes[i].children[1].checked = "";
                }
            }
            // Delay the reset so the checkbox's own click handler (which fires
            // right after this) doesn't re-enter and double-toggle the state.
            setTimeout(() => { localStorage.setItem("selectionInProgress", false); }, 10);
        }
    };
    localStorage.setItem("selectionInProgress", false);

    // ---------- W101 Trivia ----------
    // (highlights the correct answer on a question page)

    let highlightCorrectAnswer = (data) => {
        let quizTitle = window.location.href.split("https://www.wizard101.com/quiz/trivia/game/")[1];
        quizTitle = quizTitle.replace(/-/g, " ").replace("trivia", "");
        quizTitle = quizTitle.replace(/\b\w/g, l => l.toUpperCase()).trim();

        let question = $(".quizQuestion").text();

        (data[quizTitle] || []).forEach(qElement => {
            let matches = qElement[0].toUpperCase() === question.toUpperCase() ||
                          qElement[0].toUpperCase() === question.toUpperCase() + "?";
            if (!matches) return;

            $(".answerText").each(function (index, element) {
                if ($(element).text().trim() === qElement[1].trim()) {
                    $(element).css("color", "green");
                    $(element).css("font-weight", "bold");

                    // Auto-check the checkbox for the highlighted correct answer.
                    let checkbox = $(element).closest(".answer").find('.largecheckbox').get(0) ||
                                   $(element).closest(".answer").find('.largecheckboxselected').get(0);
                    if (checkbox) {
                        selectQuizAnswer(checkbox);
                        // Give the selection a moment to settle, then move on.
                        setTimeout(() => $("#nextQuestion").trigger("click"), 50);
                    }
                }
            });
        });
    };

    $.getJSON("https://raw.githubusercontent.com/KritDaMage/wizard101_trivia/main/trivia_answers.json", function (data) {
        if (triviaPages.includes(window.location.href)) {
            expandTriviaCategories(data);
        } else {
            highlightCorrectAnswer(data);
        }
    });
})();
