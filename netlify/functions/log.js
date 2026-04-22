const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_OWNER = 'rpvos-dhg';
  const REPO_NAME = 'Moetikeenjasaan.paul';
  const FILE_PATH = 'log.json';

  try {
    if (event.httpMethod === 'GET') {
      // Fetch log
      const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return {
        statusCode: 200,
        body: content
      };
    } else if (event.httpMethod === 'POST') {
      // Update log
      const newLog = JSON.parse(event.body);
      // First get current file
      const getUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
      const getResponse = await fetch(getUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (!getResponse.ok) throw new Error('Failed to get file');
      const fileData = await getResponse.json();
      // Update
      const putUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;
      const putResponse = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update log.json via Netlify Function',
          content: Buffer.from(JSON.stringify(newLog, null, 2)).toString('base64'),
          sha: fileData.sha
        })
      });
      if (!putResponse.ok) throw new Error('Failed to update');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    } else {
      return {
        statusCode: 405,
        body: 'Method not allowed'
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};