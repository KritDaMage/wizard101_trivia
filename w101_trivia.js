// ==UserScript==
// @name         W101 Trivia Solver
// @namespace    https://github.com/Jan-Fcloud/W101-TriviaAnswers
// @version      1.0
// @description  Highlights the correct Wizard101 trivia answer and speeds up the quiz UI (instant answers/next button, click-anywhere-in-box selection)
// @author       Jan-FCloud & Zalatos
// @match        https://www.wizard101.com/quiz/trivia/game*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// ==/UserScript==

/* global jQuery, selectQuizAnswer */
(function () {
    'use strict';

    // ---------- Speedy Wizard101 Quiz part ----------
    // (instant UI, click-anywhere-in-answer-box selection)

    console.debug("W101 Trivia Solver active");

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
    selectQuizAnswer = function (selectedCheckbox) {
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

    // ---------- W101 Trivia part ----------
    // (highlights the correct answer / already-answered quiz titles)

    $.getJSON("https://raw.githubusercontent.com/KritDaMage/wizard101_trivia/main/trivia_answers.json", function (data) {
        let triviaPages = [
            "https://www.wizard101.com/quiz/trivia/game/english-trivia",
            "https://www.wizard101.com/quiz/trivia/game/kingsisle-trivia",
            "https://www.wizard101.com/quiz/trivia/game/educational-trivia",
            "https://www.wizard101.com/quiz/trivia/game/fun-trivia",
            "https://www.wizard101.com/game/trivia"
        ];

        if (triviaPages.includes(window.location.href)) {
            // Overview page: highlight the titles of quizzes we have answers for.
            $(".darkerparchment_header").find("td:nth-child(2) h2").each(function (index, element) {
                let quizTitle = $(element).text().trim();
                if (data[quizTitle.replace("Trivia", "").trim()]) {
                    $(element).css("color", "green");
                    $(element).css("font-weight", "bold");
                }
            });
        } else {
            // Question page: find the current question and highlight its correct answer.
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
        }
    });
})();
