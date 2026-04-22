require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'rpvos-dhg';
const REPO_NAME = 'Moetikeenjasaan.paul';
const FILE_PATH = 'log.json';

async function getFileContent() {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!response.ok) throw new Error('Failed to fetch file');
  const data = await response.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content: JSON.parse(content), sha: data.sha };
}

async function updateFileContent(newContent, sha) {
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: 'Update log.json via API',
      content: Buffer.from(JSON.stringify(newContent, null, 2)).toString('base64'),
      sha: sha
    })
  });
  if (!response.ok) throw new Error('Failed to update file');
  return await response.json();
}

app.get('/api/log', async (req, res) => {
  try {
    const { content } = await getFileContent();
    res.json(content);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch log' });
  }
});

app.post('/api/log', async (req, res) => {
  try {
    const newLog = req.body;
    const { sha } = await getFileContent();
    await updateFileContent(newLog, sha);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});