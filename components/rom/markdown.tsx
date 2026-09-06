import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex =
    /(`[^`]+`)|(\[([^\]]+)\]\(([^)]+)\))|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const [
      full,
      code,
      ,
      linkText,
      linkUrl,
      ,
      boldItalic,
      ,
      bold,
      ,
      italic,
      ,
      strike,
    ] = match;

    if (code) {
      tokens.push(
        <code key={match.index} className="inline-code">
          {code.slice(1, -1)}
        </code>,
      );
    } else if (linkText && linkUrl) {
      const isSafe = /^https?:\/\/|^\/|^mailto:|^#/.test(linkUrl.trim());
      tokens.push(
        isSafe ? (
          <a
            key={match.index}
            href={linkUrl.trim()}
            target="_blank"
            rel="noreferrer noopener"
            className="markdown-link"
          >
            {renderInline(linkText)}
          </a>
        ) : (
          linkText
        ),
      );
    } else if (boldItalic) {
      tokens.push(
        <strong key={match.index}>
          <em>{boldItalic}</em>
        </strong>,
      );
    } else if (bold) {
      tokens.push(<strong key={match.index}>{bold}</strong>);
    } else if (italic) {
      tokens.push(<em key={match.index}>{italic}</em>);
    } else if (strike) {
      tokens.push(<del key={match.index}>{strike}</del>);
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : [text];
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: 'code'; lang?: string; code: string }
  | { type: 'blockquote'; lines: string[] }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'hr' }
  | { type: 'p'; text: string };

function parseBlocks(raw: string): Block[] {
  const lines = raw.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') });
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = Math.min(Math.max(headingMatch[1].length, 1), 6) as
        | 1
        | 2
        | 3
        | 4
        | 5
        | 6;
      blocks.push({
        type: 'heading',
        level,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('>')) {
      const bqLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        bqLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', lines: bqLines });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line.trim())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(---|___|\*\*\*)$/.test(lines[i].trim())
    ) {
      pLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', text: pLines.join('\n') });
  }

  return blocks;
}

export function Markdown({
  content,
  className = '',
}: {
  content?: string | null;
  className?: string;
}) {
  if (!content) return null;
  const blocks = parseBlocks(content);

  return (
    <div className={`markdown-body selectable ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1)
              return <h1 key={idx}>{renderInline(block.text)}</h1>;
            if (block.level === 2)
              return <h2 key={idx}>{renderInline(block.text)}</h2>;
            if (block.level === 3)
              return <h3 key={idx}>{renderInline(block.text)}</h3>;
            if (block.level === 4)
              return <h4 key={idx}>{renderInline(block.text)}</h4>;
            if (block.level === 5)
              return <h5 key={idx}>{renderInline(block.text)}</h5>;
            return <h6 key={idx}>{renderInline(block.text)}</h6>;
          }
          case 'code':
            return (
              <pre key={idx} className="code-block selectable">
                <code>{block.code}</code>
              </pre>
            );
          case 'blockquote':
            return (
              <blockquote key={idx}>
                {block.lines.map((l, li) => (
                  <p key={li}>{renderInline(l)}</p>
                ))}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={idx}>
                {block.items.map((it, ii) => (
                  <li key={ii}>{renderInline(it)}</li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx}>
                {block.items.map((it, ii) => (
                  <li key={ii}>{renderInline(it)}</li>
                ))}
              </ol>
            );
          case 'hr':
            return <hr key={idx} />;
          case 'p':
            return (
              <p key={idx}>
                {block.text.split('\n').map((line, li, arr) => (
                  <React.Fragment key={li}>
                    {renderInline(line)}
                    {li < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            );
        }
      })}
    </div>
  );
}
