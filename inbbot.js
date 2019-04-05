const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const botMessages = require('./msg.js');
const config = require('./config.js');
const sql = require('sqlite3');

const conf = new config();
const bot = new TelegramBot(conf.token, {polling: true});
const bm = new botMessages();

const db = new sql.Database(conf.db, (err) => {
    if(err)
        return console.log(err.message);
});

const modGrpId = conf.mod, botGrpId = conf.bot, offGrpId = conf.off;

// Restricts user if mute parameter is true, else completely mutes
// the user.
function restrictMem(grpId, memId, time, mute = true) {
    
    let t = Math.floor((new Date().getTime()) / 1000) + Math.floor(time * 24 * 60 * 60);

    bot.restrictChatMember(grpId, memId,
	{"can_send_media_messages": false,
	"can_send_other_messages": false,
	"can_add_web_page_previews": false,
	"can_send_messages": mute,
	"until_date": t
	});
}

// Bans the user if ban parameter is true, else restricts/mutes the
// user.
function muteOban(msg, match, ban = false) {

    const grpId = botGrpId;
    const fromMsgId = msg.message_id;
    
    if(msg.hasOwnProperty("reply_to_message")) {
    
	const forwarded = msg["reply_to_message"].hasOwnProperty("forward_from");
	const fromId = msg.from.id;
	
	bot.getChatMember(grpId, fromId)
	.then((data) => {
	    if(data.status === "creator" || data.status === "administrator" && data.can_restrict_members) {
		
		const from = forwarded ? "forward_from" : "from";

		const memName = msg.reply_to_message[from].hasOwnProperty("username") ? '@' + msg.reply_to_message[from].username : msg.reply_to_message[from].first_name;
		const memId = msg.reply_to_message[from].id;
		const memMsgId = msg.reply_to_message.message_id; 
		const t = match[2] != undefined ? Number(match[2]) : 10;

		ban ? bot.kickChatMember(grpId, memId) : restrictMem(grpId, memId, t, false);

		if(!forwarded) {
		    bot.deleteMessage(grpId, fromMsgId);
		    bot.deleteMessage(grpId, memMsgId);
		}

		bot.sendMessage(grpId, `${memName} has been ${ban ? "banned" : `muted for ${t} day(s)`}.`);

	    } else {
		bot.deleteMessage(grpId, fromMsgId);
	    }
	});
    } else {
	bot.deleteMessage(grpId, fromMsgId);
    }
}

// Sends welcome message and restrict users until they do not verify themselves 
// when they join the group.
bot.on("new_chat_members", (msg) => {

    const grpId = msg.chat.id;

    if(grpId === botGrpId) {
        const memId = msg.new_chat_member.id;
        const memName = msg.new_chat_member.hasOwnProperty("username") ? '@' + msg.new_chat_member.username : msg.new_chat_member.first_name;

        let query = `select * from users where tid = ? and verified = 1`;
        db.get(query, [memId], (err, result) => {
            if(err)
                console.log(err.message);
            if(!result) {
                query = `insert into users(tid) values(${memId})`;
                db.all(query, [], (err, result) => {
                    if(err)
                        console.log(err.message);
                
                    bot.sendMessage(grpId, 
	                `Welcome ${memName}!, Please send a '/verify' message to @indiabitsbot to prove that you're a human. Once done, you'll be able to send messages in this group.`,
                    )
                    .then((msg) => {

                        restrictMem(grpId, memId, 600, false);
                    
                        setTimeout(() => {
                            bot.deleteMessage(grpId, msg.message_id);
                        },  300000);
                    });
                });
            }
        });
}});

bot.onText(/^(\/mute)\s?(\d+)?|(\/ban)$/, (msg, match) => {

    if(/(\/mute)\s?(\d+)?/.test(match[1]))
	muteOban(msg, match);
    else
	muteOban(msg, match, true);
});

// Forwards reported message by user (/report) to the mod group
// alerting all the admins.
bot.onText(/^\/report$/, (msg, match) => {

    const grpId = msg.chat.id;
    if(msg.hasOwnProperty("reply_to_message")) {
	const repoterId = msg.from.id;
	const memId = msg.reply_to_message.from.id;
	const grpId = msg.chat.id;
	const reMsgId = msg.reply_to_message.message_id;

	if(grpId === botGrpId || reporterId !== memId) {	
	    bot.forwardMessage(modGrpId, grpId, reMsgId);
	    bot.sendMessage(grpId, "Reported to admins, thanks.");	
	}
    } else {
	const memMsgId = msg.message_id;
	bot.deleteMessage(grpId, memMsgId);
    }	
});

// Stores messages in txt file for word cloud.
bot.on('message', (msg) => {
        
    let re = /http[s]?/gi;
		
    if(msg.chat.id === botGrpId || msg.chat.id === offGrpId) {
	    if(msg.text != undefined && !re.test(msg.text)) {

            let tmp = msg.text.replace(bm.commonWords(), '');
            
            let filename = msg.chat.id === botGrpId ? "messages.txt" : "offmessages.txt";

	        fs.appendFile(filename, " " + tmp, (err) => {
		    if(err) throw err;
	        });
	    }
    }
});

// Ban user when the message matches the pattern.
bot.onText(/(crypto|free|binance)[-_\s]?signal[sz]?/gi, (msg, match) => {

    const grpId = msg.chat.id;
    const memId = msg.from.id;
    const msgId = msg.message_id;

    bot.kickChatMember(grpId, memId);
    bot.deleteMessage(grpId, msgId);

});


// Tags
bot.onText(/^#(ta|start|dyor|shill|p2p|off)$/gi, (msg, match) => {

    const grpId = msg.chat.id;
    const msgId = msg.message_id;

    let m = match[1].toLowerCase()
    let replyMsg = bm[m]();
     
    if(msg.hasOwnProperty("reply_to_message")) {

	const targetMsgId = msg.reply_to_message.message_id;
	bot.sendMessage(grpId, replyMsg, {"reply_to_message_id": targetMsgId, "parse_mode" : "HTML", "disable_web_page_preview" : true});
	bot.deleteMessage(grpId, msgId);
    
    } else {
	
	bot.sendMessage(grpId, replyMsg, {"reply_to_message_id": msgId, "parse_mode" : "HTML", "disable_web_page_preview" : true});
    }
});

// Mutes member when a banned word is detected.
bot.on('message', (msg) => {

    const words = bm.badw();
    const grpId = msg.chat.id;
    
    if(grpId == botGrpId) {
    
        const msgId = msg.message_id;
        const memId = msg.from.id;
        const memName = msg.from.hasOwnProperty("username") ? '@' + msg.from.username : msg.from.first_name;
            
        if(words.test(msg.text)) {
	        bot.sendMessage(grpId, `${memName} you have been temporarily muted for 10 minutes.\nDo not use foul language in this channel, next time you will be banned permanently`);
	        bot.deleteMessage(grpId, msgId);
	        restrictMem(grpId, memId, 0.007, false);
        }
    }
});

// Auto delete t.me links not related to indiabits.
bot.onText(/(https?:\/\/)?(t|telegram)\.me\/(\w+)/gi, (msg, match) => {

    if(!(/indiabits|IndiaBitsOT|BitcoinIndia/gi.test(match[3]))) {
	bot.deleteMessage(botGrpId, msg.message_id);
    }
    
});

// Auto delete documents
bot.on('document', (msg) => {
    if(msg.document.mime_type != "video/mp4")
        bot.deleteMessage(msg.chat.id, msg.message_id);
});

bot.onText(/\/start/, (msg, match) => {
    if(msg.chat.type === "private") {
       
        bot.sendMessage(msg.chat.id, 
            `Welcome ${msg.from.first_name}!, Indiabits is about Indian crypto community and everything related to it.\n\nℹ️ Please read the group @indiabitsrules before posting.\n\nTo verify yourself please click here 👉 /verify.`,
          );
    }
});

bot.onText(/\/verify/gi, (msg, match) => {

    if(msg.chat.type === "private") {
        bot.sendMessage(msg.chat.id, "Please click the button below to verify yourself.",
            {"reply_markup" : {
                "inline_keyboard" : [[{
                    "text" : "Verify", "callback_data" : msg.from.id
                }]]}}
        );

    } else {
        bot.deleteMessage(botGrpId, msg.message_id);
    }

});

bot.on('callback_query', (msg) => {
   
    if(msg.message.text.includes("verify")) {
        let query = `select * from users where tid = ?`;
  
        db.get(query, [msg.data], (err, result) => {
            if(err)
                console.log(err);
            else {
                if(result == undefined || result.verified == 1) {
                    bot.editMessageText("You are already verified.",{"chat_id":msg.message.chat.id, "message_id":msg.message.message_id}); 
                    bot.answerCallbackQuery(msg.id);
                } else {
                    query = `update users set verified = ? where tid = ?`;
                    db.run(query, [1,msg.data], (err) => {
                        if(err)
                            console.log(err);
                        else {
                                    bot.editMessageText("✅ You are now verified and can send messages in @Indiabits",{"chat_id":msg.message.chat.id, "message_id":msg.message.message_id}); 
                                    bot.answerCallbackQuery(msg.id);
                                    bot.restrictChatMember(conf.bot, msg.data,
                                        {"can_send_media_messages": true,
                                         "can_send_other_messages": true,
                                         "can_add_web_page_previews": true,
                                         "can_send_messages": true,
                                         "until_date": 0
                                        });
                    }
                    });
                }
            }
            
        });
    }   
});


bot.onText(/\/warn\s?(\w.+)?/gi, (msg, match) => {

    const grpId = msg.chat.id;
    console.log(match);
    if(msg.hasOwnProperty("reply_to_message")) {

        const fromId = msg.from.id;

        bot.getChatMember(botGrpId, fromId)
        .then((data) => {
                if(data.status === "creator" || data.status === "administrator" && data.can_restrict_members) {
                    
                    const memId = msg.reply_to_message.from.id;
                    const memMsgId = msg.reply_to_message.message_id;
                    const memName = msg.reply_to_message.from.hasOwnProperty("username")? '@' + msg.reply_to_message.from.username : msg.reply_to_message.from.first_name;
                    const reason = match[1] != undefined ? 'Reason: ' + match[1] : 'Reason: not specified';

                    let query = 'select * from users where tid = ?';

                    db.get(query, [memId], (err, result) => {

                        if(err)
                            console.log(err);
                        else {
                        
                            if(result) {
                                if(result.warn == 2) {
                                    bot.kickChatMember(grpId, memId);
                                    bot.sendMessage(grpId, `${memName} has been kicked.`);
                                    
                                    query = 'update users set warn = 0 where tid = ?';

                                    db.all(query, [memId], (err) => {
                                        if(err)
                                            console.log(err);
                                    });

                                } else {
                                    query = 'update users set warn = warn + 1 where tid = ?';

                                    db.all(query, [memId], (err) => {
                                        if(err)
                                            console.log(err);
                                        else {
                                            let warns = result.warn + 1;
                                            bot.sendMessage(grpId, `${memName} has been warned (${warns}/3).\n${reason}`);
                                }});
                                
                                }

                            } else {

                                query = 'insert into users(tid,warn) values(?,?)';

                                db.all(query, [memId, 1], (err) => {
                                    if(err)
                                        console.log(err);
                                    else 
                                        bot.sendMessage(grpId, `${memName} has been warned (1/3).\n${reason}`);
    
                                });

                            }                            
                        }
                    });
                    bot.deleteMessage(grpId, memMsgId);
                } else {
                    bot.sendMessage(modGrpId, grpId, msg.reply_to_message.message_id);
                }
        });
    }
    bot.deleteMessage(grpId, msg.message_id);
});


// Allows users to rate each other.
bot.onText(/^([-+]1)$/, (msg, match) => {
    
    const grpId = msg.chat.id;

    if(grpId == botGrpId || grpId == offGrpId) {
        if(msg.hasOwnProperty("reply_to_message")) {
            const num = Number(match[0]);
            const targetUser = msg.reply_to_message.from.id;
            const memName = msg.reply_to_message.from.hasOwnProperty("username")? '@' + msg.reply_to_message.from.username : msg.reply_to_message.from.first_name;

            let query = 'select points from users where tid = ?';

            db.get(query, [targetUser], (err, result) => {
                if(err)
                    console.log(err)
                else {
                    if(result) {
                        query = 'update users set points = points + ? where tid = ?';
                        db.all(query, [num, targetUser], (err) => {
                            if(err)
                                console.log(err);
                            else {
                                bot.sendMessage(grpId,`${memName} now has ${result.points + num} points.`);
                            }
                        });
                    } else {
                        query = 'insert into users(tid, verified, warn, points) values(?,?,?,?)';
                        db.all(query, [targetUser, 1, 0, num], (err) => {
                            if(err)
                                console.log(err);
                            else { 
                                bot.sendMessage(grpId,`${memName} now has ${0 + num} points.`);
                            }
                        });
                    }
                }
            });
        }
    }
});
