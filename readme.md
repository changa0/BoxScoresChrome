README.md

# SlimScore

## get today's nba box scores

A lightweight Google Chrome extension application to view live NBA scores

### Notes
* the application uses chrome extension permissions to obtain NBA live stats data in JSON, without cross origin restrictions
* view nba-api-info.txt at https://github.com/changa0/boxscores for information regarding nba stats API
* install by loading through chrome extensions dev mode

#### Version Info

v0.5 - supports basic live score info, no full box score in this version

v0.9 - full box score functionality

v.0.9.1 - bug fix where mismatched team names in info area differed from dropdown teams (Rarely, GameHeader games in api are in different order from LastMeeting in scoreboard JSON). May still encounter team mismatch for games yet to be played