import puppeteer from "puppeteer-core";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
  type ChatInputCommandInteraction,
} from "discord.js";
import { readFile } from "node:fs/promises";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const DASHBOARD_URL = process.env.DASHBOARD_URL ?? "http://localhost:5174/";
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3200";
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

// Slash command definitions
const statusCommand = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Take a screenshot of the team dashboard and post it here");

const dashboardCommand = new SlashCommandBuilder()
  .setName("dashboard")
  .setDescription("Show a summary status card of all agents");

// Register slash commands
async function registerCommands(clientId: string): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(DISCORD_BOT_TOKEN!);
  await rest.put(Routes.applicationCommands(clientId), {
    body: [statusCommand.toJSON(), dashboardCommand.toJSON()],
  });
  console.log("Registered /status and /dashboard slash commands");
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

interface AgentInfo {
  id: string;
  name: string;
  role: string;
  status: "online" | "away" | "busy" | "error" | "offline";
  lastSeen: string;
}

const STATUS_EMOJI: Record<string, string> = {
  online: "\uD83D\uDFE2",
  busy: "\uD83D\uDFE0",
  away: "\uD83D\uDFE1",
  error: "\uD83D\uDD34",
  offline: "\u26AA",
};

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function handleDashboardCommand(cmd: ChatInputCommandInteraction): Promise<void> {
  await cmd.deferReply();

  try {
    const res = await fetch(`${API_BASE_URL}/api/agents`);
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    const agents: AgentInfo[] = await res.json();

    const counts: Record<string, number> = { online: 0, busy: 0, away: 0, error: 0, offline: 0 };
    for (const a of agents) counts[a.status] = (counts[a.status] || 0) + 1;

    const statsLine = `\uD83D\uDFE2 Online ${counts.online}  |  \uD83D\uDFE0 Busy ${counts.busy}  |  \u26AA Offline ${counts.offline}`;

    const agentLines = agents.map((a) => {
      const emoji = STATUS_EMOJI[a.status] || "\u26AA";
      const time = formatRelativeTime(a.lastSeen);
      return `${emoji} **${a.name}** (${a.role}) \u2014 ${time}`;
    });

    const embed = new EmbedBuilder()
      .setTitle("\uD83D\uDC3E Team Status")
      .setColor(0x5865f2)
      .setDescription(`${statsLine}\n\n${agentLines.join("\n")}`)
      .setFooter({ text: `Updated ${new Date().toLocaleString()}` })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("View Full Dashboard \u2192")
        .setStyle(ButtonStyle.Link)
        .setURL(DASHBOARD_URL),
    );

    await cmd.editReply({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error("Failed to handle /dashboard command:", err);
    await cmd.editReply({ content: "Failed to fetch agent status. Is the API running?" });
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction as ChatInputCommandInteraction;

  if (cmd.commandName === "dashboard") {
    return handleDashboardCommand(cmd);
  }

  // /status command
  if (cmd.commandName !== "status") return;
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
