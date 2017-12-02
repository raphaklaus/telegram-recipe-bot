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
const $;

bot.onText(/\/receita (.+)/ , (msg, match) => {
  console.log(msg)
  let fromId = msg.chat.id;
  let pageInfo = {};

  request(generateOptions(`${rootSite}/busca.php?q=${match[1]}`)).then(html => {
    $ = cheerio.load(html);
    let links = $('[class="box-hover"] > a').toArray().map(item => {
      if ($(item).children('.photo-holder').children().get(0).attribs.src.match(/recipe_original/g))
        $(item).remove();
      else
        return item;
    });
    let linkEscolhido = Math.floor(Math.random() * links.length);
    return request(generateOptions(`${rootSite}/${links[linkEscolhido].attribs.href}`));
  })
  .then(html => {
    console.log('getting img');
    $ = cheerio.load(html);
    pageInfo.title = $('.recipe-title > h1').text();
    pageInfo.ingredients = $('.p-ingredient').toArray().map(item => $(item).text());
    pageInfo.instructions = $('.e-instructions > ol > li > span')
      .toArray().map(item => $(item).text());

    if ($('.photo.pic.u-photo').length > 0) {
      pageInfo.photoUrl = $('.photo.pic.u-photo').get(0).attribs.src.split('?')[0];
      return bot.sendPhoto(fromId, pageInfo.photoUrl)
    }
  })
  .then(() => {
    console.log('sending message');
    return bot.sendMessage(fromId, `Receita: ${pageInfo.title} \n*Ingredientes* \n\n${pageInfo.ingredients.join('\n\n')}` +
      `\n\n*Modo de preparo*\n${pageInfo.instructions.join('\n\n')}`, {parse_mode: 'Markdown'});
  })
  .catch(error => console.log(error));
});

const generateOptions = (uri) => {
  return {
    uri,
    method: 'GET',
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'User-Agent': 'Mozilla / 5.0(X11; Linux x86_64) AppleWebKit / 537.36(KHTML, like Gecko) Chrome / 62.0.3202.94 Safari / 537.36'
    }
  }
};