const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const token = "TokenGoesHere";
const bot = new TelegramBot(token, {polling: true});

let prevMsgId = 0;
const modGrpId = 0, botGrpId = 0;

// Restricts user if mute parameter is true, else completely mutes
// the user.
function restrictMem(grpId, memId, time, mute = true) {
    
    let t = Math.floor((new Date().getTime()) / 1000) + (time * 24 * 60 * 60);

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

    if(msg.hasOwnProperty("reply_to_message")) {
    
	const forwarded = msg["reply_to_message"].hasOwnProperty("forward_from");
	const fromId = msg.from.id;
	const grpId = forwarded ? botGrpId : msg.chat.id;

	bot.getChatMember(grpId, fromId)
	.then((data) => {
	    if(data.status === "creator" || data.status === "administrator" && data.can_restrict_members) {
		
		const from = forwarded ? "forward_from" : "from";

		const fromMsgId = msg.message_id;
		const memGrpId = msg.reply_to_message.chat.id;
		const memName = msg.reply_to_message[from].hasOwnProperty("username") ? '@' + msg.reply_to_message[from].username : msg.reply_to_message[from].first_name;
		const memId = msg.reply_to_message[from].id;
		const memMsgId = msg.reply_to_message.message_id; 

		ban ? bot.kickChatMember(grpId, memId) : restrictMem(grpId, memId, match[2] != undefined ? Number(match[2]) : 10, false);

		if(!forwarded) {
		    bot.deleteMessage(grpId, fromMsgId);
		    bot.deleteMessage(grpId, memMsgId);
		}

		bot.sendMessage(grpId, `${memName} has been ${ban ? "banned" : "muted"}.`);

	    } else {
		bot.deleteMessage(grpId, memMsgId);
	    }
	});
    } else {
	bot.deleteMessage(grpId, msgId);
    }
}

// Sends welcome message and restrict users for specific period of time
// when they join the group.
bot.on("new_chat_members", (msg) => {

    const grpId = msg.chat.id;
    const memId = msg.new_chat_member.id;
    const memName = msg.new_chat_member.hasOwnProperty("username") ? '@' + msg.new_chat_member.username : msg.new_chat_member.first_name;

    if(prevMsgId)
	bot.deleteMessage(grpId, prevMsgId);

    bot.sendMessage(grpId, 
	`Welcome ${memName}!, This chat is about Indian crypto community and everything related to it.\nPlease read the group rules before posting.`,
	{"reply_markup" : {
	    "inline_keyboard" : [[{
	    "text": "Read Rules", "url" : "telegra.ph/IndiaBits-Rules-09-10"
	}]]}}
    )
    .then((data) => {prevMsgId = data.message_id});

    restrictMem(grpId, memId, 96);
});

bot.onText(/(\/mute)\s?(\d+)?|(\/ban)/, (msg, match) => {

    if(match[1] === "/mute")
	muteOban(msg, match);
    else
	muteOban(msg, match, true);
});

// Forwards reported message by user (/report) to the mod group
// alerting all the admins.
bot.onText(/\/report/, (msg, match) => {

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
    console.log(msg);
    if(msg.chat.id === botGrpId) {

	fs.appendFile('messages.txt', " " + msg.text, (err) => {
	    if(err) throw err;
	});
    }
});

// Ban user when the message matches the pattern.
bot.onText(/free[_\s]?signal[sz]?/gi, (msg, match) => {

    const grpId = msg.chat.id;
    const memId = msg.from.id;
    const msgId = msg.message_id;

    bot.kickChatMember(grpId, memId);
    bot.deleteMessage(grpId, msgId);

});
