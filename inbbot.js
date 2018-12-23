const TelegramBot = require('node-telegram-bot-api');
const token = "TokenGoesHere";
const bot = new TelegramBot(token, {polling: true});
let prevMsgId = 0;

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

function muteOban(msg, match, ban = false) {

    if(msg.hasOwnProperty("reply_to_message")) {
	
	const fromId = msg.from.id;
	const grpId = msg.reply_to_message.chat.id;

	bot.getChatMember(grpId, fromId)
	.then((data) => {
	    if(data.status === "creator" || data.status === "administrator" && data.can_restrict_members) {
		const fromMsgId = msg.message_id;
		const memName = msg.reply_to_message.from.first_name;
		const memId = msg.reply_to_message.from.id;
		const memMsgId = msg.reply_to_message.message_id; 

		ban ? bot.kickChatMember(grpId, memId) : restrictMem(grpId, memId, Number(match[2]), false);

		bot.deleteMessage(grpId, fromMsgId);
		bot.deleteMessage(grpId, memMsgId);
		bot.sendMessage(grpId, `${memName} has been ${ban ? "banned" : "muted"}.`);

	    } else {
		bot.deleteMessage(grpId, memMsgId);
	    }
	});
    }
}

bot.on("new_chat_members", (msg) => {

    const grpId = msg.chat.id;
    const memId = msg.new_chat_member.id;
    const memName = msg.new_chat_member.first_name;

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

bot.onText(/(\/mute)\s(\d+)|(\/ban)/, (msg, match) => {

    if(match[1] === "/mute")
	muteOban(msg, match);
    else
	muteOban(msg, match, true);
});
