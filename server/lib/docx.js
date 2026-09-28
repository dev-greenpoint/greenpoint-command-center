// Minimal .docx writer for plain text backups (Deck Creator "Download").
// Takes a list of blocks and returns a Buffer:
//   { type: 'title' | 'h1' | 'h2' | 'h3' | 'p' | 'bullet', text }
//   { type: 'kv', label, text }   → bold "label: " then text
// Uses Word's built-in Title/Heading styles so the file reads back cleanly
// (including through mammoth when re-uploaded to Deck Creator).
const JSZip = require('jszip');

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const run = (text, bold) => `<w:r>${bold ? '<w:rPr><w:b/></w:rPr>' : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const STYLE = { title: 'Title', h1: 'Heading1', h2: 'Heading2', h3: 'Heading3' };

function paragraph(b) {
  if (b.type === 'bullet') {
    return `<w:p><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr>${run('•\t' + b.text)}</w:p>`;
  }
  if (b.type === 'kv') return `<w:p>${run(`${b.label}: `, true)}${run(b.text)}</w:p>`;
  const style = STYLE[b.type];
  return `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${run(b.text)}</w:p>`;
}

const heading = (id, name, size, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/>${extra}</w:pPr><w:rPr><w:b/><w:color w:val="2F4A3A"/><w:sz w:val="${size}"/></w:rPr></w:style>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
${heading('Title', 'Title', 44)}
${heading('Heading1', 'heading 1', 32, '<w:outlineLvl w:val="0"/>')}
${heading('Heading2', 'heading 2', 26, '<w:outlineLvl w:val="1"/>')}
${heading('Heading3', 'heading 3', 23, '<w:outlineLvl w:val="2"/>')}
</w:styles>`;

async function buildDocx(blocks) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`);
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  zip.file('word/styles.xml', STYLES);
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${blocks.map(paragraph).join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

module.exports = { buildDocx };
