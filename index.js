// Load environment variables
require('dotenv').config();

// Import modules
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Discord client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

// Welcome message templates (random greetings)
const WELCOME_GREETINGS = [
  "Wah ada member baru nih!",
  "Halo gan, selamat datang di YoiGan! 🎉",
  "Eh ada yang baru gabung nih~",
  "Welcome gan di YoiGan! 👋",
  "Hai hai, selamat datang ya!",
  "Akhirnya gabung juga nih 🙂",
  "Selamat datang di YoiGan! Santai aja di sini~",
  "Wih ada agan baru! Selamat datang ya 🎉",
];

// Welcome engagement questions (random)
const WELCOME_QUESTIONS = [
  "Btw, apa yang bawa agan ke sini?",
  "Boleh tau ga, biasanya suka main game apa?",
  "Kenalin dong, dari mana nih?",
  "Ini pertama kalinya gabung di sini ya gan?",
  "Suka ngobrolin topik apa biasanya?",
  "Lagi nyari komunitas buat apa nih?",
  "Ada yang bisa dibantu ga?",
  "Penasaran nih, dapet info YoiGan dari mana?",
];

// Helper function to get random item from array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Bot personality system prompt
const SYSTEM_PROMPT = `You are an assistant bot in a Discord server called "YoiGan!".

═══════════════════════════════════════
LANGUAGE RULE — HIGHEST PRIORITY (MUST FOLLOW)
═══════════════════════════════════════
- You MUST reply in the SAME LANGUAGE the user used.
- If user writes in English → reply in English ONLY.
- If user writes in Indonesian → reply in Indonesian ONLY.
- If mixed → use the dominant language.
- If unclear → default to Indonesian.
- NEVER switch languages unless the user does.
- Do NOT explain or ask about language preference.

═══════════════════════════════════════
PERSONALITY
═══════════════════════════════════════
- Casual, friendly, community-like tone
- Light emojis allowed 🙂
- Never formal or robotic

When replying in INDONESIAN:
- Use "gan" or "agan" naturally inside sentences (not every sentence)
- Example: "Iya gan, betul banget.", "Oh gitu ya agan."
- Do NOT use "juragan" unless asked about it

When replying in ENGLISH:
- Do NOT use "gan", "agan", or "juragan"
- Keep casual and friendly tone

═══════════════════════════════════════
IDENTITY RULES
═══════════════════════════════════════
- Never say you are AI, ChatGPT, or OpenAI
- If asked "who are you?" → say you are YoiGan.ID assistant bot
- If asked about owner/creator → answer:
  "This bot and server was created by <@466646594910027776>. Check out https://vormaza.com 🙂"

Keep responses short and natural.`;

// Generate AI response using OpenAI
async function getAIResponse(userMessage) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 120,
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    return "Sorry, I'm having trouble thinking right now. Please try again later! 😅";
  }
}

// Check if bot was mentioned in the message
function isBotMentioned(message, client) {
  return message.mentions.has(client.user);
}

// Check if message is a reply to the bot
async function isReplyToBot(message, client) {
  if (!message.reference) return false;

  try {
    const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
    return repliedMessage.author.id === client.user.id;
  } catch {
    return false;
  }
}

// Extract clean message content (remove bot mention)
function getCleanMessage(message, client) {
  return message.content
    .replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '')
    .trim();
}

// Bot ready event
client.once('ready', () => {
  console.log(`✅ Bot is ready! Logged in as ${client.user.tag}`);
  console.log(`🤖 Listening for mentions and replies...`);

  // Set bot streaming status
  client.user.setActivity('Mention me!', {
    type: 1, // 1 = Streaming
    url: 'https://www.twitch.tv/vormaza',
  });
});

// Message handler
client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Check if bot should respond
  const mentioned = isBotMentioned(message, client);
  const repliedToBot = await isReplyToBot(message, client);

  // Only respond if mentioned or replied to
  if (!mentioned && !repliedToBot) return;

  // Get clean user message
  const userMessage = getCleanMessage(message, client);

  // If message is empty after removing mention
  if (!userMessage) {
    await message.reply("Hey! How can I help you? 👋");
    return;
  }

  try {
    // Show typing indicator
    await message.channel.sendTyping();

    // Get AI response
    const aiResponse = await getAIResponse(userMessage);

    // Send response
    await message.reply(aiResponse);
  } catch (error) {
    console.error('Error sending message:', error);
    await message.reply("Oops! Something went wrong. Please try again! 😅");
  }
});

// Welcome new members
client.on('guildMemberAdd', async (member) => {
  try {
    // Send welcome message to #general channel only
    const channel = client.channels.cache.get('475617095351009281');

    // Fail silently if channel not found
    if (!channel) return;

    // Generate random welcome message
    const greeting = getRandomItem(WELCOME_GREETINGS);
    const question = getRandomItem(WELCOME_QUESTIONS);
    const welcomeMessage = `${member} ${greeting}\n\n${question}`;

    await channel.send(welcomeMessage);
    console.log(`👋 Welcomed new member: ${member.user.tag}`);
  } catch (error) {
    console.error('Error sending welcome message:', error);
  }
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN);
