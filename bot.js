// file: bot.js

require('dotenv').config();
const { Telegraf, Markup, session } = require('telegraf');

// Инициализация бота
const bot = new Telegraf(process.env.BOT_TOKEN);

// ID канала для отзывов
const FEEDBACK_CHANNEL_ID = process.env.FEEDBACK_CHANNEL_ID;

bot.use(session({ defaultSession: () => ({}) }));

// Главное меню
const mainMenu = Markup.keyboard([
  ['📝 Отзыв', '💰 Донат']
]).resize();

// Меню доната с кнопками
const donationMenu = Markup.inlineKeyboard([
  [Markup.button.callback('📋 Копировать TON', 'copy_ton')],
  [Markup.button.callback('📋 Копировать Ethereum', 'copy_eth')],
  [Markup.button.callback('⬅️ Назад в меню', 'back_to_menu')]
]);

// Удаление предыдущего сообщения бота
async function safeReply(ctx, text, options = {}) {
  try {
    if (ctx.session.lastBotMessageId) {
      await ctx.telegram.deleteMessage(ctx.chat.id, ctx.session.lastBotMessageId);
    }
  } catch (e) {
    console.error('Ошибка удаления сообщения:', e.description);
  }
  const sent = await ctx.reply(text, options);
  ctx.session.lastBotMessageId = sent.message_id;
}

// Функция отправки временного сообщения (кошелек) с автоудалением
async function sendTemporaryMessage(ctx, text, delay = 30000) {
  const message = await ctx.reply(text, { parse_mode: 'Markdown' });
  setTimeout(async () => {
    try {
      await ctx.telegram.deleteMessage(ctx.chat.id, message.message_id);
    } catch (e) {
      console.error('Ошибка удаления временного сообщения:', e.description);
    }
  }, delay);
}

// Старт бота
bot.start(async (ctx) => {
  ctx.session.state = null;
  await safeReply(
    ctx,
    'Welcome, вы нашли то самое место, где сможете глянуть отзывы живых людей, а так же оставить свой личный и рассказать об опыте работы с нашей командой.',
    mainMenu
  );
});

// Кнопка "📝 Отзыв"
bot.hears('📝 Отзыв', async (ctx) => {
  ctx.session.state = 'waiting_for_feedback';
  await safeReply(
    ctx,
    'Здесь, вы можете оставить свой отзыв, рассказав во всех деталях моменты нашего сотрудничества.\n\n<a href="https://t.me/reviewsmarx">Отзывы других клиентов</a>',
    { parse_mode: 'HTML' }
  );
});

// Кнопка "💰 Донат"
bot.hears('💰 Донат', async (ctx) => {
  ctx.session.state = 'donation';
  await safeReply(
    ctx,
    'Мы не настаиваем на помощи нашей команде материальными средствами, но будем рады любому донату с вашей стороны.\n\n' +
    '💳 Crypto Реквизиты:\n' +
    '• Сеть The Open Network (TON)\nUQAcBFnkIlr4S-TI9ZB2oCOW611T9VMowPYBSGWs2RwXM8ZP\n\n' +
    '• Сеть Ethereum (ERC-20)\n0xc466948801be8084b6f0c29b96e7c42c33e7ac11\n\n' +
    'Также доступны варианты с онлайн переводами на банковскую карту, об этом вы можете уточнить в <a href="https://t.me/marxstudchat">чате</a>.',
    {
      parse_mode: 'HTML',
      reply_markup: donationMenu.reply_markup
    }
  );
});

// Кнопка "⬅️ Назад"
bot.hears('⬅️ Назад', async (ctx) => {
  ctx.session.state = null;
  await safeReply(ctx, 'Вы вернулись в главное меню.', mainMenu);
});

// Кнопка "✅ Задонатил"
bot.hears('✅ Задонатил', async (ctx) => {
  ctx.session.state = null;
  await safeReply(ctx, 'Спасибо большое за вашу поддержку! ❤️', mainMenu);
});

// Inline кнопки

// Копировать TON
bot.action('copy_ton', async (ctx) => {
  await ctx.answerCbQuery('Адрес TON скопирован! 📋');
  await sendTemporaryMessage(ctx, '`UQAcBFnkIlr4S-TI9ZB2oCOW611T9VMowPYBSGWs2RwXM8ZP`\n\nНажмите на текст и удерживайте для копирования.');
});

// Копировать Ethereum
bot.action('copy_eth', async (ctx) => {
  await ctx.answerCbQuery('Адрес Ethereum скопирован! 📋');
  await sendTemporaryMessage(ctx, '`0xc466948801be8084b6f0c29b96e7c42c33e7ac11`\n\nНажмите на текст и удерживайте для копирования.');
});

// Назад в меню
bot.action('back_to_menu', async (ctx) => {
  await ctx.answerCbQuery();
  ctx.session.state = null;
  await safeReply(ctx, 'Вы вернулись в главное меню.', mainMenu);
});

// Приём текстовых сообщений (отзывов)
bot.on('text', async (ctx) => {
  if (ctx.session.state === 'waiting_for_feedback') {
    const feedback = ctx.message.text;
    await ctx.telegram.sendMessage(
      FEEDBACK_CHANNEL_ID,
      `Отзыв от @${ctx.from.username || ctx.from.id}:\n\n${feedback}`
    );
    await safeReply(ctx, 'Спасибо за ваш отзыв! 🙏', mainMenu);
    ctx.session.state = null;
  }
});

// Глобальная обработка ошибок
bot.catch((err, ctx) => {
  console.error(`Ошибка в обновлении ${ctx.update.update_id}:`, err);
});

// Запуск бота
bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));