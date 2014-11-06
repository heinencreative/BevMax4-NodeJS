#!/bin/sh
forever start --a -l /Users/venderson/Desktop/arnie2/nodelog.txt /Users/venderson/Desktop/arnie2/server.js
sleep 10
osascript -e 'tell app "System Events" to display dialog "Node server started correctly, fool."'