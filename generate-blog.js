#!/usr/bin/env node

const simpleGit = require('simple-git');
const fs = require('fs');
const path = require('path');

const BRANCH = process.env.BRANCH || 'main';
const MAX_POSTS = parseInt(process.env.MAX_POSTS || '50', 10);
const OUTPUT_DIR = 'dist';

// Get commits
async function getCommits() {
  try {
    const git = simpleGit();
    const log = await git.log({
      maxCount: MAX_POSTS,
      [BRANCH]: null,
    });

    console.log(`Raw commits found: ${log.all.length}`);
    log.all.forEach((commit, index) => {
      console.log(`\nCommit ${index + 1}:`);
      console.log(`  Hash: ${commit.hash.substring(0, 7)}`);
      console.log(`  Author: ${commit.author_name}`);
      console.log(`  Date: ${commit.date}`);
      console.log(`  Message: ${commit.message.substring(0, 60)}${commit.message.length > 60 ? '...' : ''}`);
    });

    // Filter out commits that start with [ignore]
    const filteredCommits = log.all.filter((commit) => {
      const title = commit.message.split('\n')[0];
      return !title.toLowerCase().startsWith('[ignore]');
    });

    console.log(`Commits after filtering [ignore]: ${filteredCommits.length}`);

    return filteredCommits.map((commit) => {
      return {
        hash: commit.hash.substring(0, 7),
        author: commit.author_name,
        email: commit.author_email,
        date: new Date(commit.date).toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
        title: commit.message.split('\n')[0],
        content: commit.body || commit.message.split('\n')[0],
      };
    });
  } catch (error) {
    console.error('Error fetching commits:', error.message);
    process.exit(1);
  }
}

// Generate HTML
function generateHTML(commits) {
  const postsHTML = commits
    .map(
      (commit) => `
    <article class="post">
      <header>
        <h2>${escapeHTML(commit.title)}</h2>
        <div class="meta">
          <span class="author">${escapeHTML(commit.author)}</span>
          <span class="date">${commit.date}</span>
          <span class="commit">#${commit.hash}</span>
        </div>
      </header>
      <div class="content">
        ${escapeHTML(commit.content)
          .split('\n')
          .map((line) => `<p>${line}</p>`)
          .join('')}
      </div>
    </article>
  `
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Commit Blog</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      border-radius: 8px;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      color: #2c3e50;
    }

    .subtitle {
      color: #7f8c8d;
      margin-bottom: 40px;
      font-size: 1.1rem;
    }

    .post {
      margin-bottom: 50px;
      padding-bottom: 40px;
      border-bottom: 1px solid #ecf0f1;
    }

    .post:last-child {
      border-bottom: none;
    }

    .post h2 {
      font-size: 1.8rem;
      margin-bottom: 15px;
      color: #34495e;
    }

    .meta {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      font-size: 0.9rem;
      color: #7f8c8d;
      flex-wrap: wrap;
    }

    .meta span {
      display: flex;
      align-items: center;
    }

    .author::before {
      content: '👤 ';
      margin-right: 5px;
    }

    .date::before {
      content: '📅 ';
      margin-right: 5px;
    }

    .commit {
      font-family: 'Courier New', monospace;
      background: #ecf0f1;
      padding: 2px 8px;
      border-radius: 3px;
    }

    .content {
      font-size: 1.05rem;
      color: #555;
    }

    .content p {
      margin-bottom: 15px;
    }

    .content p:empty {
      display: none;
    }

    footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 2px solid #ecf0f1;
      text-align: center;
      color: #95a5a6;
      font-size: 0.9rem;
    }

    @media (max-width: 768px) {
      body {
        padding: 10px;
      }

      .container {
        padding: 20px;
      }

      h1 {
        font-size: 2rem;
      }

      .post h2 {
        font-size: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Commit Blog</h1>
      <p class="subtitle">A blog generated from git commits</p>
    </header>

    <main>
      ${postsHTML}
    </main>

    <footer>
      <p>Generated from ${commits.length} commit${commits.length !== 1 ? 's' : ''}</p>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Main
async function main() {
  console.log('Generating blog from commits...');

  const commits = await getCommits();
  console.log(`Found ${commits.length} commits`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const html = generateHTML(commits);
  const outputPath = path.join(OUTPUT_DIR, 'index.html');
  fs.writeFileSync(outputPath, html, 'utf-8');

  console.log(`✓ Blog generated at ${outputPath}`);
  console.log(`✓ Total posts: ${commits.length}`);
}

main();
