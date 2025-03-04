import plugin from '../../lib/plugins/plugin.js';
import fetch from 'node-fetch';
import puppeteer from "../../lib/puppeteer/puppeteer.js";


const baseUrl = 'https://oiapi.net/API/Kuwo/';
const searchResults = {}; 
const timeouts = {}; 
const muic_ls = 10 
export class MusicPlugin extends plugin {
    constructor() { 
        super({                                                          
            name: 'yinyue', 
            dsc: '音乐搜索与播放',
            event: 'message',
            priority: 3000,
            rule: [
                {
                    reg: '^#点歌(.*)',
                    fnc: 'searchMusic'
                },
                {
                    reg: '^#听[1-9][0-9]|#听[0-9]*$', 
                    fnc: 'playSelectedMusic' 
                }
            ]
        });

    }

    async searchMusic(e) {                                              
        const query = e.msg.replace(/#点歌/g, "").trim(); 
        if (!query) {
            e.reply('请输入有效的歌曲名');
            return;
        }

        const url = `${baseUrl}?msg=${encodeURIComponent(query)}&br=1&page=1&limit=${muic_ls}`;
        
        try {
            const response = await fetch(url); 
            const data = await response.json(); 
            
            if (!data || !data.data || data.data.length === 0) {
                e.reply(`未找到相关音乐`);
                return;
            }

            const results = data.data.map((item, index) => ({
                id: item.rid, 
                song: item.song, 
                singer: item.singer, 
            }));

            if (results.length === 0) {
                e.reply('解析结果为空，请稍后再试');
                return;
            }

            searchResults[e.user_id] = results; ;
            const timeoutId = setTimeout(() => {
                e.reply("等待超时，请重新获取",true)
                delete searchResults[e.user_id];
                delete timeouts[e.user_id];   
            }, 60000);
            timeouts[e.user_id] = timeoutId;

            let xvhao = ''
            let song = ''
            let zuozhe = ''
            let ml = process.cwd()

            let replyMessage = `找到以下音乐：\n`;
            results.forEach((item, index) => {
                replyMessage += `${index + 1}. ${item.song} - ${item.singer}\n`;
                xvhao += `${index + 1},`
                song += `${item.song},`
                zuozhe += `${item.singer},`
            });
            replyMessage += `请回复 #听X （X为数字1到10）来播放对应的音乐`;
            
            //图片菜单
            // let data1 = {}
			// 	let bj = ""
			// 	const min = 1;                       
			// 	const max = 13;                         
			// 	const range = max - min;                      
			// 	const random = Math.random();                 
			// 	const result = min + Math.round(random * range); 
			// 	bj = String(result)
			// 	data1 = {
			// 		tplFile: './resources/music_core/ShareMusic.html',
			// 		xvhao: xvhao,
			// 		song: song,
			// 		zuozhe: zuozhe,
            //         dz: ml,
			// 		bj: bj
			// 	}

			// 	let img = await puppeteer.screenshot("123", {
			// 		...data1,
			// 	});
			// 	e.reply(img)


            //普通文本菜单回复
            e.reply(replyMessage);

        } catch (error) {
            console.error('Error fetching music:', error);
            e.reply('发生错误，请稍后再试');
        }
    }

    async playSelectedMusic(e) {
        const selection = parseInt(e.msg.replace(/#听/g, "").trim(), 10);
        const userResults = searchResults[e.user_id]; 

        if (!userResults){
            console.log("用户：QQ("+e.user_id+")未点歌")
            return;
        }
        else if (selection < 1 || selection > userResults.length) {
            e.reply('无效的选择，请重新尝试'); 
            return;
        }
        const selectedMusic = userResults[selection - 1]; 

        const url = `${baseUrl}?msg=${encodeURIComponent(selectedMusic.song)}&n=${selection}&br=3&page=1`; // 构建API请求URL
        try {
            const response = await fetch(url); 
            const data = await response.json(); 

            if (!data) {
                e.reply('无法获取音乐文件，请稍后再试');
                return;
            }

            e.reply(`正在获取音频：${selectedMusic.song} - ${selectedMusic.singer}`); 
            
            //发送本地语音
            // e.reply(segment.record(data.data.url)); 

            let musicUrl = data.data.url
            let musiv_zuozhe = data.data.singer
            let music_titile = data.data.song
            let music_imjin = data.data.picture
            const tebaos = {
                "type":"music",
                    "data":{
                        "type":"custom",
                        "url":musicUrl,
                        "audio":musicUrl,
                        "title":music_titile,
                        "image":music_imjin,
                        "singer":musiv_zuozhe
            }
            }
            e.reply(tebaos)
            clearTimeout(timeouts[e.user_id]);
            delete searchResults[e.user_id];
            delete timeouts[e.user_id];
            console.log(searchResults[e.user_id])
        } catch (error) {
            console.error('Error playing music:', error); 
            e.reply('发生错误，请稍后再试'); 
        }
    }
}



