// Deck-wide photo styles for AI image generation. The deck stores the id
// (content.photo_style); the matching wording is appended to every image
// prompt so all images in a deck look like one set.
const PHOTO_STYLES = {
  warm: { label: 'Warm editorial', prompt: 'Warm editorial photography, soft natural light, gentle warm tones, shallow depth of field.' },
  bright: { label: 'Bright lifestyle', prompt: 'Bright lifestyle photography, airy daylight, fresh natural colours, candid and relaxed.' },
  moody: { label: 'Moody cinematic', prompt: 'Moody cinematic photography, low-key lighting, deep shadows, rich contrast.' },
  minimal: { label: 'Clean minimal', prompt: 'Clean minimal photography, simple uncluttered background, soft even light, plenty of negative space.' },
};
const DEFAULT_STYLE = 'warm';
// Applies to every image: AI images fall apart on text and logos.
const ALWAYS = 'Photorealistic. No text, words, signs, logos or watermarks.';

function styledPrompt(prompt, style) {
  const s = PHOTO_STYLES[style] || PHOTO_STYLES[DEFAULT_STYLE];
  return `${prompt.trim().replace(/[.\s]*$/, '.')} ${s.prompt} ${ALWAYS}`;
}

module.exports = { PHOTO_STYLES, DEFAULT_STYLE, styledPrompt };
