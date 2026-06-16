const { google } = require('googleapis');
const { getDb, saveDb } = require('./database');

function rows(result) {
  if (!result.length) return [];
  return result[0].values.map(row =>
    Object.fromEntries(result[0].columns.map((c, i) => [c, row[i]]))
  );
}

async function getAuthClient() {
  // Support key file path or base64-encoded JSON content
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  let credentials;
  if (keyPath) {
    credentials = require(require('path').resolve(keyPath));
  } else if (keyRaw) {
    try {
      credentials = JSON.parse(Buffer.from(keyRaw, 'base64').toString());
    } catch {
      credentials = JSON.parse(keyRaw);
    }
  } else {
    throw new Error('No Google service account key configured. Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH or GOOGLE_SERVICE_ACCOUNT_KEY in .env');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return auth.getClient();
}

async function createFolder(drive, name, parentId) {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  });
  return res.data.id;
}

async function runDrive(clientId) {
  try {
    const db = await getDb();
    const client = rows(db.exec('SELECT name FROM clients WHERE id=?', [clientId]))[0];
    if (!client) return;

    const authClient = await getAuthClient();
    const drive = google.drive({ version: 'v3', auth: authClient });

    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || null;
    const rootId = await createFolder(drive, client.name, parentFolderId);

    await Promise.all(
      ['Strategy', 'Assets', 'Reporting', 'Campaigns'].map(name => createFolder(drive, name, rootId))
    );

    const folderUrl = `https://drive.google.com/drive/folders/${rootId}`;

    db.run('UPDATE clients SET drive_folder_url=? WHERE id=?', [folderUrl, clientId]);
    db.run(
      `UPDATE onboarding_checklist SET completed=1, completed_at=? WHERE client_id=? AND auto_type='drive'`,
      [new Date().toISOString(), clientId]
    );
    saveDb();
    console.log(`[Drive] Folder created for client ${clientId}: ${folderUrl}`);
  } catch (err) {
    console.error(`[Drive] Failed for client ${clientId}:`, err.message);
  }
}

module.exports = { runDrive };
