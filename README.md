# Indiabitsbot
Bot for indiabits telegram group.

## Requirement
- [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api) (Telegram Bot API for NodeJS)
- [sqlite3](https://github.com/mapbox/node-sqlite3) (SQLite3 bindings for Node.js) 

## Configuration
Edit config.js to configure telegram token and other details.

### Database Schema
```
Table: users.
0|ID|INTEGER (Primary key)
1|tid|int
2|verified|int
3|warn|int
4|points|int
```

## Starting bot
```
node inbbot.js
```
