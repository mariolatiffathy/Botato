const { Client } = require('discord.js');
const yt = require('ytdl-core');
const client = new Client();

let queue = {};

var prefix = "%";
var adminID = "301073031801995264";

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage('Add some songs to the queue first with ' + prefix + 'add');
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.sendMessage('Already Playing');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.sendMessage('Queue is empty').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.sendMessage(`Playing: **${song.title}** as requested by: **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : 1 });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(prefix + 'pause')) {
					msg.channel.sendMessage('paused').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(prefix + 'resume')){
					msg.channel.sendMessage('resumed').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(prefix + 'skip')){
					msg.channel.sendMessage('skipped').then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith('volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.sendMessage(`Volume: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(prefix + 'time')){
					msg.channel.sendMessage(`time: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.sendMessage('error: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('I couldn\'t connect to your voice channel...');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'add': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.sendMessage('You must add a YouTube video URL, or ID after ' + prefix + 'add');
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.sendMessage('Invalid YouTube Link: ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.sendMessage(`added **${info.title}** to the queue`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.sendMessage('Add some songs to the queue first with ' + prefix + 'add');
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Requested by: ${song.requester}`);});
		msg.channel.sendMessage(`__**${msg.guild.name}'s Music Queue:**__ Currently **${tosend.length}** songs queued ${(tosend.length > 15 ? '*[Only next 15 shown]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	},
	'help': (msg) => {
		let tosend = ["=== MUSIC HELP ===", '```', prefix + 'join : "Join Voice channel of msg sender"',	prefix + 'add : "Add a valid youtube link to the queue"', prefix + 'queue : "Shows the current queue, up to 15 songs shown."', prefix + 'play : "Play the music queue if already joined to a voice channel"', '', 'the following commands only function while the play command is running:'.toUpperCase(), prefix + 'pause : "pauses the music"',	prefix + 'resume : "resumes the music"', prefix + 'skip : "skips the playing song"', prefix + 'time : "Shows the playtime of the song."',	'volume+(+++) : "increases volume by 2%/+"',	'volume-(---) : "decreases volume by 2%/-"', '```', "=== MODERATION HELP ===", '```', prefix + "clear (number of messages) : Prunes/purges/clears the chat", prefix + "broadcast (message) : Broadcasts a message to all the server members.", prefix + "kick (member) : Kicks a member from the server.", '```'];
		msg.channel.sendMessage(msg.author + " check your DM for the help list! :white_check_mark:");
		msg.author.sendMessage(tosend.join('\n'));
	},
	'reboot': (msg) => {
		if (msg.author.id == adminID) process.exit(); //Requires a node module like Forever to work.
	},
	'clear': (msg) => {
		let limit2 = msg.content.split(' ')[1];
		if (limit2 >= 100) {
			var MessagesToBeCleared = 100;
		} else {
			var MessagesToBeCleared = limit2;
		}
			if(msg.channel.permissionsFor(msg.member).hasPermission("MANAGE_MESSAGES")) {
				if (limit2 == '' || limit2 === undefined) {
					msg.channel.sendMessage(msg.author + " | Enter the number of messages to clear. :x:");
					return;
				} else {
					async function clear() {
						msg.delete();
						const fetched = await msg.channel.fetchMessages({limit: MessagesToBeCleared});
						msg.channel.bulkDelete(fetched);
					}
					clear();
					msg.channel.sendMessage(":white_check_mark: | Cleared " + MessagesToBeCleared + " messages.");
				}
			} else {
				msg.channel.sendMessage(msg.author + " | No permissions! :x:");
			}
		
	},
	'broadcast': (msg) => {
		let message2broadcast = msg.content.split(' ').splice(1).join(' ');
		if (!msg.channel.permissionsFor(msg.member).hasPermission("ADMINISTRATOR")) {
			msg.channel.sendMessage(msg.author + " | No permissions! :x:");
			return;
		} else {
			if (!message2broadcast) {

				msg.channel.sendMessage(msg.author + " | No message entered. :x:");

			} else {
				let tosend2 = ["`Sender:`", msg.author, "`Server:`", msg.guild.name, "`Message:`", message2broadcast];
				msg.channel.guild.members.forEach(user => {
					user.send(tosend2.join('\n'));
				});
				msg.channel.sendMessage(msg.author + " | Successfully broadcasted. :white_check_mark:");
			}
		}
	},
	'kick': (msg) => {
		if (!msg.channel.permissionsFor(msg.member).hasPermission("KICK_MEMBERS")) {
			msg.channel.sendMessage(msg.author + " | No permissions! :x:");
			return;
		} else {
			
			const user = msg.mentions.users.first();
			// If we have a user mentioned
			if (user) {
			  // Now we get the member from the user
			  const member = msg.guild.member(user);
			  // If the member is in the guild
			  if (member) {
				/**
				 * Kick the member
				 * Make sure you run this on a member, not a user!
				 * There are big differences between a user and a member
				 */
				member.sendMessage("You was kicked from " + client.guilds.size + " by " + msg.author);
				member.kick('Optional reason that will display in the audit logs').then(() => {
				  // We let the message author know we were able to kick the person
				  msg.channel.sendMessage(user + " was successfully kicked by " + msg.author + " | :white_check_mark:");
				}).catch(err => {
				  // An error happened
				  // This is generally due to the bot not being able to kick the member,
				  // either due to missing permissions or role hierarchy
				  msg.channel.sendMessage(msg.author + ' | I was unable to kick the member | :x:');
				  // Log the error
				  console.error(err);
				});
			  } else {
				// The mentioned user isn't in this guild
				msg.channel.sendMessage('That user isn\'t in this guild! | :x:');
			  }
			// Otherwise, if no user was mentioned
			} else {
			  msg.channel.sendMessage(msg.author + ' | You didn\'t mention the user to kick! | :x:');
			}
			
		}
	}
};

client.on('ready', () => {
	// nothing for now
});

client.on('message', msg => {
	if (!msg.content.startsWith(prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(prefix.length).split(' ')[0]](msg);
	if (msg.guild.id == "471076071601864706" && msg.channel.id !== "471082861328334859" && msg.content.startsWith("!")) {
		async function clearBadCmds() {
						msg.delete();
						const fetched = await msg.channel.fetchMessages({limit: 2});
						msg.channel.bulkDelete(fetched);
		}
		clearBadCmds();
		msg.channel.sendMessage(msg.author + " | Please write the commands in #commands only. | :x:");
	}
});

client.login(process.env.TOKEN);