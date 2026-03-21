import puppeteer from "puppeteer-core";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder,
  type TextChannel,
  type ChatInputCommandInteraction,
} from "discord.js";
import { readFile } from "node:fs/promises";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "http://localhost:5174/";
const CHROME_PATH =
  process.env.CHROME_PATH ??
  "/usr/bin/google-chrome-stable";
const SCREENSHOT_PATH = "/tmp/dashboard-screenshot.png";
const UPDATE_INTERVAL_MS = 5 * 60 * 1000;

if (!DISCORD_BOT_TOKEN) {
  console.error("Missing DISCORD_BOT_TOKEN environment variable");
  process.exit(1);
}
if (!DISCORD_CHANNEL_ID) {
  console.error("Missing DISCORD_CHANNEL_ID environment variable");
  process.exit(1);
}

async function takeScreenshot(): Promise<Buffer> {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(DASHBOARD_URL, { waitUntil: "networkidle0", timeout: 30000 });
    await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  } finally {
    await browser.close();
  }

  return readFile(SCREENSHOT_PATH);
}

function createAttachment(buffer: Buffer): AttachmentBuilder {
  return new AttachmentBuilder(buffer, { name: "dashboard.png" });
}

// Slash command definition
const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Take a screenshot of the team dashboard and post it here");

// Register slash commands
async function registerCommands(clientId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN!);
  await rest.put(Routes.applicationCommands(clientId), {
    body: [statusCommand.toJSON()],
  });
  console.log("Registered /status slash command");
}

// Main bot logic
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

let lastMessageId: string | null = null;

async function sendOrUpdateScreenshot(): Promise<void> {
  try {
    const buffer = await takeScreenshot();
    const attachment = createAttachment(buffer);
    const channel = (await client.channels.fetch(DISCORD_CHANNEL_ID!)) as TextChannel;

    if (!channel) {
      console.error(`Channel ${DISCORD_CHANNEL_ID} not found`);
      return;
    }

    if (lastMessageId) {
      try {
        const msg = await channel.messages.fetch(lastMessageId);
        await msg.edit({ content: `Dashboard updated: ${new Date().toLocaleString()}`, files: [attachment] });
        console.log(`Updated message ${lastMessageId}`);
        return;
      } catch {
        // Message was deleted or not found, send a new one
        lastMessageId = null;
      }
    }

    const msg = await channel.send({
      content: `Dashboard screenshot: ${new Date().toLocaleString()}`,
      files: [attachment],
    });
    lastMessageId = msg.id;
    console.log(`Sent new screenshot message ${msg.id}`);
  } catch (err) {
    console.error("Failed to send/update screenshot:", err);
  }
}

client.on("ready", async () => {
  console.log(`Bot logged in as ${client.user?.tag}`);

  await registerCommands(client.user!.id);

  // Send first screenshot
  await sendOrUpdateScreenshot();

  // Schedule updates every 5 minutes
  setInterval(sendOrUpdateScreenshot, UPDATE_INTERVAL_MS);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "status") return;

  const cmd = interaction as ChatInputCommandInteraction;
  await cmd.deferReply();

  try {
    const buffer = await takeScreenshot();
    const attachment = createAttachment(buffer);
    await cmd.editReply({
      content: `Dashboard screenshot: ${new Date().toLocaleString()}`,
      files: [attachment],
    });
  } catch (err) {
    console.error("Failed to handle /status command:", err);
    await cmd.editReply({ content: "Failed to take screenshot. Is the dashboard running?" });
  }
});

client.login(DISCORD_BOT_TOKEN);
