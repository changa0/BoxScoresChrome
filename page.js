"use strict";
const SCOREBOARD_URL = "https://stats.nba.com/stats/scoreboard/?GameDate=";
const SCOREBOARD_URL_SUFFIX = "&LeagueID=00&DayOffset=0&noCache=";
const GAME_DATA_URL_PRE = "https://data.nba.com/data/v2015/json/mobile_teams/nba/";
const GAME_DATA_URL_PART = "/scores/gamedetail/";
const GAME_DATA_URL_SUFFIX = "_gamedetail.json";

var scoreboard;
var games;
var lineScore;
var lastMeeting;

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

function genUrl(type) {
    var url = "";
    if ( type === "scoreboard" ){
        var date = getDate();
        url = SCOREBOARD_URL + date[0] + SCOREBOARD_URL_SUFFIX + date[1];
    } else if (type === "game") {

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

    for (var game of lastMeeting) {
        var option = document.createElement("option");
        var gameIndex = lastMeeting.indexOf(game);
        //var awayName = game[9] + " " + game[10];
        //var homeName = game[4] + " " + game[5];
        var awayAbbrev = game[11];
        var homeAbbrev = game[6];
        var gameStatus = games[gameIndex][4]; // shows time or final
        var playing = games[gameIndex][9];

        option.text = awayAbbrev + " vs. " + homeAbbrev + " - " + gameStatus;
        option.value = gameIndex;
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
 *  Updates scores for current game by removing the old table and then adding updated.
 */
function updateScore() {
    var dropdown = document.getElementById("dropdown");
    if ( dropdown.value == "" ) dropdown.value = 0; // edge case when going from day w/ no games to day w/ games
    var selected = dropdown.value;
    var game = lastMeeting[selected];
    var awayName = game[9] + " " + game[10];
    var homeName = game[4] + " " + game[5];

    // delete info if existing
    if ( document.getElementById("info") ) deleteInfo();

    // check if game hasn't started yet
    if ( games[selected][9] == 0 ) {
        dropdown.setAttribute("class", "inactive");
        inactiveGame(awayName, homeName, selected);
        return;
    } else { // remove inactive style if present
        if ( dropdown.getAttribute("class") ) dropdown.setAttribute("class","active");
    }

    var placeholder = document.getElementById("placeholder");
    var awayLineScore = lineScore[ 2*selected ];
    var homeLineScore = lineScore[ 2*selected+1 ];
    var awayScore = awayLineScore[21];
    var homeScore = homeLineScore[21];

    //create div to contain info elements
    var toUpdate = document.createElement("div");
    toUpdate.setAttribute("id", "info");
    var text;

    var teamsInfo = genTeamInfo(awayName, homeName);
    toUpdate.appendChild(teamsInfo);

    var scores = formatScoreText(awayScore, homeScore);
    toUpdate.appendChild(scores[0]);
    toUpdate.appendChild(scores[1]);
    toUpdate.appendChild(scores[2]);

    var period = document.createElement("h2");
    if ( games[selected][4] == "Final" ) {
        text = document.createTextNode("Final");
    } else {
        text = document.createTextNode( "Q" + games[selected][9] + "\xa0\xa0" + games[selected][10] );
    }
    period.appendChild(text);
    toUpdate.appendChild(period);

    var quarterTable = genQuarterTable( selected, awayLineScore, homeLineScore );
    toUpdate.appendChild(quarterTable);

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

function genQuarterTable(game, away, home) {
    var currentQuarter = games[game][9];
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

    var awayRow = quarterTableHelper( away, currentQuarter );
    var homeRow = quarterTableHelper( home, currentQuarter );
    tblBody.appendChild(awayRow);
    tblBody.appendChild(homeRow);
    tbl.appendChild(tblHead);
    tbl.appendChild(tblBody);
    tbl.setAttribute("id", "quarter-table");
    return tbl;
}

function quarterTableHelper(team, quarters) {
    var row = document.createElement("tr");
    var cell = document.createElement("td");
    var cellText = document.createTextNode(team[4]);

    cell.appendChild(cellText);
    row.appendChild(cell);

    var counter = 4;
    if ( quarters > 4 ) counter = quarters;
    for ( var i = 0; i < counter; i++ ) {
        cell = document.createElement("td");
        if ( i < quarters ) {
            cellText = document.createTextNode(team[7 + i]);
        } else { // if quarter hasn't been played yet
            cellText = document.createTextNode("-");
        }
        cell.appendChild(cellText);
        row.appendChild(cell);
    }
    return row;
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
        var row = rowHelper(rowData);
        table.appendChild(row);
        rowData = team1;
    } else {
        var rowData = team1;
        var row = rowHelper(rowData);
        table.appendChild(row);
        rowData = team2;
    }
    row = rowHelper(rowData);
    table.appendChild(row);
    return table;
}

/**
 * use for creating table rows
 * @param {array} rowData - an array of strings for table data cells
 */
function rowHelper(rowData) {
    var row = document.createElement("tr");

    for (var text of rowData) {
        var cell = document.createElement("td");
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

    var recordsHeader = document.createElement("h3");
    recordsHeader.appendChild( document.createTextNode("Team Records") );
    if ( lastMeeting[game][11] === lineScore[2*game][4] ) { // check team match
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