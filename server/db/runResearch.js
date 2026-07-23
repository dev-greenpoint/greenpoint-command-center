const Anthropic = require('@anthropic-ai/sdk');
const { query } = require('./database');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function fetchWebsiteText(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
  } catch {
    return null;
  }
}

async function runResearch(clientId) {
  try {
    const [client] = await query('SELECT * FROM clients WHERE id=?', [clientId]);
    if (!client || !client.name) return;

    let websiteContext = '';
    if (client.website) {
      const text = await fetchWebsiteText(client.website);
      if (text) websiteContext = `\n\nWebsite content:\n${text}`;
    }

    const prompt = `You are a research assistant for an Australian media agency.

Write a 2-3 sentence summary of what this client does — who they are, what they do, and who they serve. Plain text only, no headers, no bullet points, no sign-off.

If there is not enough information to write a summary, respond with exactly: "No information found."

Client: ${client.name}${websiteContext}

Also, on a new line at the end, write: INDUSTRY: [one short category, e.g. Retail, Hospitality, Technology, NFP, Finance]`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text;
    const industryMatch = raw.match(/INDUSTRY:\s*(.+)/i);
    const industry = industryMatch ? industryMatch[1].trim() : null;
    const summary = raw.replace(/INDUSTRY:\s*.+/gi, '').trim();
    const research = summary === 'No information found.' ? null : summary;

    if (industry) {
      await query('UPDATE clients SET research=?, industry=? WHERE id=?', [research, industry, clientId]);
    } else {
      await query('UPDATE clients SET research=? WHERE id=?', [research, clientId]);
    }
  } catch (err) {
    console.error(`Research failed for client ${clientId}:`, err.message);
  }
}

module.exports = { runResearch };
