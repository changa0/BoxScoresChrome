"use strict";
const SCOREBOARD_URL = "https://stats.nba.com/stats/scoreboard/?GameDate=";
const SCOREBOARD_URL_SUFFIX = "&LeagueID=00&DayOffset=0&noCache=";
const GAME_URL_PRE = "https://data.nba.com/data/v2015/json/mobile_teams/nba/";
const GAME_URL_PART = "/scores/gamedetail/";
const GAME_URL_SUFFIX = "_gamedetail.json";

var scoreboard;
var games;
var lineScore;
var lastMeeting;
var gameJSON;

document.getElementById("dropdown").onchange = updateScore;
document.getElementById("update").onclick = function() {getScoreboardJSON("refresh")};

getScoreboardJSON("new");

/**
 * returns today's date
*/
function getDate() {
    var date = new Date( Date.now() );
    // param to prevent caching of json
    var noCache = date.getTime() - 1.515e12;
    var options = {
        year: "numeric",
        month: "numeric",
        day: "numeric",
    };
    var formatted = new Intl.DateTimeFormat("en-US", options).format(date);

    return [formatted, noCache];
}

function genUrl(type, season, gameId) {
    var url = "";
    if ( type === "scoreboard" ){
        var date = getDate();
        url = SCOREBOARD_URL + date[0] + SCOREBOARD_URL_SUFFIX + date[1];
    } else if (type === "game") {
        url = GAME_URL_PRE + season + GAME_URL_PART + gameId + GAME_URL_SUFFIX;
    }
    return url;
}

/**
 * Get JSON data for scoreboard
 * @param {string} flag - determines new page load or update via button
 */
function getScoreboardJSON(flag) {
    var url = genUrl("scoreboard");
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "json";
    xhr.onload = function () {
        scoreboard = xhr.response;
        games = scoreboard.resultSets[0].rowSet;
        lineScore = scoreboard.resultSets[1].rowSet;
        lastMeeting = scoreboard.resultSets[3].rowSet;
        if ( flag === "new") {
            getGames();
        } else if ( flag === "refresh" ) {
            refresh();
        }
    }
    xhr.send();
}

function checkNoGames() {
    if ( games.length < 1 ) {
        displayAlert("No games available today");
        var noGames = document.createElement("h1");
        noGames.setAttribute("id", "no-games");
        noGames.appendChild( document.createTextNode("No games available today") );
        document.getElementById("placeholder").appendChild(noGames);

        if ( document.getElementById("info") ) deleteInfo();
        return true;
    }
    return false;
}

function populateDropdown() {
    var dropdown = document.getElementById("dropdown");

    for (var game of games) {
        var option = document.createElement("option");
        var index = games.indexOf(game);
        var gameCode = games[index][5];
        var awayAbbrev = gameCode.substring(9,12);
        var homeAbbrev = gameCode.substring(12);
        var gameStatus = games[index][4]; // shows time or final
        var playing = games[index][9];

        option.text = awayAbbrev + " vs. " + homeAbbrev + " - " + gameStatus;
        option.value = index;
        if ( playing == 0 ) {
            option.setAttribute("class", "inactive");
        } else {
            option.setAttribute("class", "active");
        }
        dropdown.appendChild(option);
    }
}

function clearDropdown() {
    if( document.getElementById("dropdown").hasChildNodes() ) document.getElementById("dropdown").innerText = "";
}

/**
 *
 * @param {string} gameId string containing gameID for selected game
 */
function getGameJSON(gameId) {
    var season = games[0][8];
    var url = genUrl("game", season, gameId);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "json";
    xhr.onload = function () {
        gameJSON = xhr.response.g; // g for JSON key
        formatInfo();
    }
    xhr.send();
}

/**
 * Updates scores for current game by removing the old table, managing games that
 * have yet to start, and then calls for the JSON data belonging to a specific game.
 */
function updateScore() {
    var dropdown = document.getElementById("dropdown");
    if ( dropdown.value == "" ) dropdown.value = 0; // edge case when going from day w/ no games to day w/ games
    var selected = dropdown.value;
    var gameId = games[selected][2];

    // delete info if existing
    if ( document.getElementById("info") ) deleteInfo();

    // check if game hasn't started yet
    if ( games[selected][9] === 0 ) {
        var game = lastMeeting[selected];
        var awayName = game[9] + " " + game[10];
        var homeName = game[4] + " " + game[5];
        dropdown.setAttribute("class", "inactive");
        inactiveGame(awayName, homeName, selected);
        return;
    } else { // remove inactive style if present
        if ( dropdown.getAttribute("class") ) dropdown.setAttribute("class","active");
    }

    getGameJSON(gameId);
}

/**
 * Creates and adds the DOM elements for the formatted info
 */
function formatInfo() {
    var selected = document.getElementById("dropdown").value;
    var placeholder = document.getElementById("placeholder");
    var awayName = gameJSON.vls.tc + " " + gameJSON.vls.tn;
    var homeName = gameJSON.hls.tc + " " + gameJSON.hls.tn;
    var awayStats = gameJSON.vls;
    var homeStats = gameJSON.hls;

    //create div to contain info elements
    var toUpdate = document.createElement("div");
    toUpdate.setAttribute("id", "info");
    var text;

    var teamsInfo = genTeamInfo(awayName, homeName);
    toUpdate.appendChild(teamsInfo);

    var scores = formatScoreText( gameJSON.lpla.vs, gameJSON.lpla.hs );
    toUpdate.appendChild(scores[0]);
    toUpdate.appendChild(scores[1]);
    toUpdate.appendChild(scores[2]);

    var period = document.createElement("h2");
    if ( gameJSON.stt === "Final" ) {
        text = document.createTextNode("Final");
    } else {
        var clock = gameJSON.cl.replace(/^0+/, '');
        text = document.createTextNode(gameJSON.stt + "\xa0\xa0" + clock);
    }
    period.appendChild(text);
    toUpdate.appendChild(period);

    var quarterTable = genQuarterTable( awayStats, homeStats );
    toUpdate.appendChild(quarterTable);

    var awayBox = genBox(awayStats, awayName);
    var homeBox = genBox(homeStats, homeName);
    toUpdate.appendChild(awayBox);
    toUpdate.appendChild(homeBox);

    var recordsHeader = document.createElement("h3");
    text = document.createTextNode("Team Records");
    recordsHeader.appendChild(text);
    var records = genRecords(selected, 0);
    records.setAttribute("id", "record-table");

    toUpdate.appendChild(recordsHeader);
    toUpdate.appendChild(records);
    placeholder.appendChild(toUpdate);
}

function genTeamInfo(away, home) {
    var header = document.createElement("h2");
    header.appendChild( document.createTextNode( away + " at " + home ) );
    return header;
}

function formatScoreText(left, right) {
    var leftElement = document.createElement("h1");
    var rightElement = document.createElement("h1");
    var center = document.createElement("h1");
    var leftText = document.createTextNode(left);
    var rightText = document.createTextNode(right);

    leftElement.appendChild( document.createTextNode(left) );
    center.appendChild( document.createTextNode("\u2013") ); //endash
    rightElement.appendChild( document.createTextNode(right) );

    if ( left > right ) {
        leftElement.setAttribute("class", "leading");
    } else if ( left < right ) {
        rightElement.setAttribute("class", "leading");
    }

    return [leftElement, center, rightElement];
}

function genQuarterTable(awayStats, homeStats) {
    var currentQuarter = gameJSON.p;
    var tbl = document.createElement("table");
    var tblHead = document.createElement("thead");
    var tblBody = document.createElement("tbody");
    var header = "<tr><th>Team</th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th>";

    // OT tonight
    if ( currentQuarter > 4 ) {
        for ( var i = 1; i <= currentQuarter - 4; i++ ) {
            if ( i == 1 ) {
                header += "<th>OT</th>";
            } else {
                header += "<th>OT" + i + "</th>";
            }
        }
    }
    header += "</tr>";
    tblHead.innerHTML = header;

    var awayRow = quarterTableHelper( awayStats, currentQuarter );
    var homeRow = quarterTableHelper( homeStats, currentQuarter );
    tblBody.appendChild(awayRow);
    tblBody.appendChild(homeRow);
    tbl.appendChild(tblHead);
    tbl.appendChild(tblBody);
    tbl.setAttribute("id", "quarter-table");
    return tbl;
}

function quarterTableHelper(team, quarter) {
    var row = document.createElement("tr");
    var cell = document.createElement("td");
    var cellText = document.createTextNode(team.ta);

    cell.appendChild(cellText);
    row.appendChild(cell);

    var counter = 4; // make 4 cells at min
    if ( quarter > 4 ) counter = quarter;
    for ( var i = 1; i <= counter; i++ ) {
        cell = document.createElement("td");
        if ( i < 5 && i <= quarter ) {
            cellText = document.createTextNode( team[ "q" + i ] );
        } else if ( i > 4 ) {
            cellText = document.createTextNode( team[ "ot" + (i-4) ] );
        } else { // if quarter hasn't been played yet
            cellText = document.createTextNode("-");
        }
        cell.appendChild(cellText);
        row.appendChild(cell);
    }
    return row;
}

function genBox(team , teamName) {
    var boxData = team.pstsg; //player stats
    var div = document.createElement("div");
    div.setAttribute("class", "box-area");
    var label = document.createElement("h2");
    label.appendChild( document.createTextNode(teamName) );
    div.appendChild(label);
    var inactive = [];

    var tbl = document.createElement("table");
    var tblHead = document.createElement("thead");
    var tblBody = document.createElement("tbody");
    var headData = [ "", "Pos", "Min", "FG", "3Pt", "FT", "Pts", "Reb", "Off", "Def", "Ast", "Blk", "Stl", "TO", "BA", "PF", "+/-" ];
    var header = rowHelper(headData, "th");
    tblHead.appendChild(header);
    var key = "Off: Offensive rebounds<br>Def: Defensive rebounds<br>BA: Blocked shot attempts<br>Bolded players: On court";
    var tooltip = document.createElement("span");
    tooltip.innerHTML = key;
    tblHead.setAttribute("class", "tooltippable");
    tblHead.appendChild(tooltip);

    for (var p of boxData) {
        var name = p.fn + " " + p.ln;
        if ( p.status === "I" ) {
            inactive.push(name);
            continue;
        }
        var time = p.min + ":" + (function(s) {if (s < 10) s = "0" + s; return s;})(p.sec);
        var fg = p.fgm + "-" + p.fga;
        var tp = p.tpm + "-" + p.tpa;
        var ft = p.ftm + "-" + p.fta;
        var rowData = [ name, p.pos, time, fg, tp, ft, p.pts, p.reb, p.oreb, p.dreb, p.ast, p.blk, p.stl, p.tov, p.blka, p.pf, p.pm];
        var row = rowHelper(rowData, "td");
        if ( p.court === 1 ) row.setAttribute("class", "on-court");
        tblBody.appendChild(row);
    }
    tbl.appendChild(tblHead);
    tbl.appendChild(tblBody);
    tbl.setAttribute("class", "box-table");
    div.appendChild(tbl);

    var text = "Inactive: ";
    for ( var i = 0; i < inactive.length; i++ ) {
        if ( i < inactive.length - 1) {
            text += inactive[i] + " | ";
        } else {
            text += inactive[i];
        }
    }
    var extra = document.createElement("h4");
    extra.appendChild( document.createTextNode(text) );
    div.appendChild(extra);

    return div;
}

/**
 * generate team records info, fix if server returns data in opposite order
 * @param {number} game - index for selected game
 * @param {number} fix - flag to fix or not
 */
function genRecords(game, fix) {
    var table = document.createElement("table");
    var team1 = [ lineScore[2*game][4], "(" + lineScore[2*game][6] + ")" ];
    var team2 = [ lineScore[ 2*game+1 ][4], "(" + lineScore[ 2*game+1 ][6] + ")" ];
    if ( fix === 1 ) {
        var rowData = team2;
        var row = rowHelper(rowData, "td");
        table.appendChild(row);
        rowData = team1;
    } else {
        var rowData = team1;
        var row = rowHelper(rowData, "td");
        table.appendChild(row);
        rowData = team2;
    }
    row = rowHelper(rowData, "td");
    table.appendChild(row);
    return table;
}

/**
 * use for creating table rows
 * @param {array} rowData - an array of strings for table data cells
 * @param {string} cellType - specify either th or td
 */
function rowHelper(rowData, cellType) {
    var row = document.createElement("tr");

    for (var text of rowData) {
        var cell = document.createElement(cellType);
        var cellText = document.createTextNode(text);
        cell.appendChild(cellText);
        row.appendChild(cell);
    }
    return row;
}

/**
 * generates info for games yet to begin
 * @param {string} awayName
 * @param {string} homeName
 * @param {number} game - index of game
 */
function inactiveGame(awayName, homeName, game) {
    var placeholder = document.getElementById("placeholder");
    var toUpdate = document.createElement("div");
    toUpdate.setAttribute("id", "info");

    var teamsInfo = genTeamInfo(awayName, homeName);
    toUpdate.appendChild(teamsInfo);

    var message = document.createElement("h1");
    message.setAttribute("class", "message");
    message.appendChild( document.createTextNode("Game begins at") );
    toUpdate.appendChild(message);

    var gameTime = document.createElement("h2");
    gameTime.setAttribute("class", "message");
    gameTime.appendChild( document.createTextNode( games[game][4] ) );
    toUpdate.appendChild(gameTime);

    var recordsHeader = document.createElement("h2");
    recordsHeader.appendChild( document.createTextNode("Team Records") );
    if ( games[game][5].substring(12) === lineScore[2*game+1][4] ) { // check team match
        var records = genRecords(game, 0);
    } else {
        var records = genRecords(game, 1);                  // or else fix
    }
    records.setAttribute("id", "record-table");

    toUpdate.appendChild(recordsHeader);
    toUpdate.appendChild(records);
    placeholder.appendChild(toUpdate);
}

function deleteInfo() {
    var info = document.getElementById("info");
    info.remove();
}

/**
 * create an alert message which will show on overlay, instead of using window.alert()
 * @param {string} text message to appear in alert
 */
function displayAlert(text) {
    var overlay = document.createElement("div");
    overlay.setAttribute("id", "overlay");
    overlay.onclick = dismissAlert;
    var message = document.createElement("h1");
    message.setAttribute("id", "overlay-message");
    message.appendChild( document.createTextNode(text) );
    overlay.appendChild(message);
    var dismissText = document.createElement("h5");
    dismissText.append( document.createTextNode("(Press to dismiss message)") );

    overlay.appendChild(message);
    overlay.appendChild(dismissText);
    document.body.appendChild(overlay);
}

function dismissAlert() {
    var overlay = document.getElementById("overlay");
    overlay.remove();
}

function getGames() {
    if ( checkNoGames() ) return;
    populateDropdown();
    updateScore();
}

function refresh() {
    var dropdown = document.getElementById("dropdown");
    var selectedGame = dropdown.value;

    if ( checkNoGames() ) return;
    if ( document.getElementById("no-games") ) document.getElementById("no-games").remove(); // edge case
    clearDropdown();
    populateDropdown();
    dropdown.value = selectedGame;  //restore selected game in dropdown, to reflect displayed
    updateScore();
}

function debugDate(date) {
    clearDropdown();
    if ( document.getElementById("info") ) deleteInfo();
    var url = SCOREBOARD_URL + date + SCOREBOARD_URL_SUFFIX + Math.floor( Math.random() * 1000 );
    console.log(url);
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.responseType = "json";
    xhr.onload = function () {
        scoreboard = xhr.response;
        games = scoreboard.resultSets[0].rowSet;
        lineScore = scoreboard.resultSets[1].rowSet;
        lastMeeting = scoreboard.resultSets[3].rowSet;
        refresh();
    }
    xhr.send();
}