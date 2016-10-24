require('dotenv').config();

const TelegramBot = require('node-telegram-bot-api'),
  bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true}),
  httpAgent = new require('http').Agent(),
  request = require('request-promise'),
  Promise = require('bluebird'),
  crypto = require('crypto'),
  writeFile = Promise.promisify(require('fs').writeFile),
  cheerio = require('cheerio'),
  rootSite = 'http://www.tudogostoso.com.br';

httpAgent.maxSockets = 15;
var $;

bot.onText(/\/receita (.+)/ , (msg, match) => {
  console.log(msg)
  let fromId = msg.chat.id;
  let pageInfo = {};

  request({uri: `${rootSite}/busca.php?q=${match[1]}`, pool: httpAgent}).then(html => {
    $ = cheerio.load(html);
    let links = $('[class="box-hover"] > a').toArray().map(item => {
      if ($(item).children('.photo-holder').children().get(0).attribs.src.match(/recipe_original/g))
        $(item).remove();
      else
        return item;
    });
    let linkEscolhido = Math.floor(Math.random() * links.length + 1)
    return request(`${rootSite}/${links[linkEscolhido].attribs.href}`);
  })
  .then(html => {
    $ = cheerio.load(html);
    pageInfo.title = $('.recipe-title > h1').text();
    pageInfo.ingredients = $('.p-ingredient').toArray().map(item => $(item).text());
    pageInfo.instructions = $('.e-instructions > ol > li > span')
      .toArray().map(item => $(item).text());

    if ($('.photo.pic.u-photo').length > 0)
      pageInfo.photoUrl = $('.photo.pic.u-photo').get(0).attribs.src.split('?')[0];

    pageInfo.hash = crypto.createHash('md5').update(pageInfo.title).digest('hex');

    return request({uri: pageInfo.photoUrl, encoding: 'binary'});
  })
  .then((data) => {
    return writeFile(`./cloud/${pageInfo.hash}.jpg`, data, 'binary');
  })
  .then(() => bot.sendPhoto(fromId, `./cloud/${pageInfo.hash}.jpg`))
  .then(() => {
    return bot.sendMessage(fromId, `Receita: ${pageInfo.title} \n*Ingredientes* \n\n${pageInfo.ingredients.join('\n\n')}` +
      `\n\n*Modo de preparo*\n${pageInfo.instructions.join('\n\n')}`, {parse_mode: 'Markdown'});
  })
  .catch(error => console.log(error));
});
