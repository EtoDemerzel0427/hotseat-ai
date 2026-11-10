// 复盘：把 events.jsonl 压成一份时间线摘要，交给模型写评价。
import { createTwoFilesPatch } from 'diff';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { SPEAK_LANG } from './interviewer.mjs';
import { DEEP_MODEL, oneShot } from './llm.mjs';

const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;

export async function readEvents(dir) {
  const raw = await readFile(path.join(dir, 'events.jsonl'), 'utf8');
  return raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

export function buildDigest(events, starter) {
  const lines = [];
  let inserted = 0, deleted = 0, firstEdit = null, lastEditTs = 0;
  let prevCode = starter, prevSnapTs = -Infinity;
  const pauses = [];

  const emitDiff = (ts, code) => {
    if (code === prevCode) return;
    const patch = createTwoFilesPatch('before', 'after', prevCode, code, '', '', { context: 1 })
      .split('\n').slice(4).join('\n');
    lines.push(`[${mmss(ts)}] code change:\n${patch}`);
    prevCode = code;
    prevSnapTs = ts;
  };

  let lastCode = starter;
  for (const e of events) {
    switch (e.type) {
      case 'edit':
        for (const c of e.ch) { inserted += c.t.length; deleted += c.l; }
        if (firstEdit === null) firstEdit = e.ts;
        if (lastEditTs && e.ts - lastEditTs > 45_000) pauses.push([lastEditTs, e.ts]);
        lastEditTs = e.ts;
        break;
      case 'snap':
        lastCode = e.code;
        if (e.ts - prevSnapTs >= 60_000) emitDiff(e.ts, e.code);
        break;
      case 'paste':
        lines.push(`[${mmss(e.ts)}] pasted ${e.chars} characters at once`);
        break;
      case 'run':
        emitDiff(e.ts, lastCode);
        lines.push(`[${mmss(e.ts)}] custom run: ${e.compileOk ? `exit ${e.exitCode}${e.timedOut ? ' (timeout)' : ''}` : 'compilation failed'}`);
        break;
      case 'test': {
        emitDiff(e.ts, lastCode);
        const failed = e.failed?.length ? `; failed: ${e.failed.join(' | ')}` : '';
        lines.push(`[${mmss(e.ts)}] ran tests: ${e.compileOk ? `${e.passed}/${e.total} passed${failed}` : `compilation failed\n${(e.compileErr || '').slice(0, 600)}`}`);
        break;
      }
      case 'chat': lines.push(`[${mmss(e.ts)}] candidate${e.voice ? ' (spoken, speech-to-text)' : ''}: ${e.text}`); break;
      case 'speak': lines.push(`[${mmss(e.ts)}] interviewer${e.kind ? ` (${e.kind})` : ''}: ${e.text}`); break;
      case 'note': lines.push(`[${mmss(e.ts)}] (interviewer's private note) ${e.text}`); break;
      case 'stage': lines.push(`[${mmss(e.ts)}] stage ${e.index + 1} revealed`); break;
      case 'end':
        emitDiff(e.ts, e.code ?? lastCode);
        lines.push(`[${mmss(e.ts)}] interview ended`);
        break;
    }
  }
  const total = events.length ? events[events.length - 1].ts : 0;
  const stats = [
    `Total time: ${mmss(total)}`,
    `First code edit: ${firstEdit === null ? 'none' : mmss(firstEdit)}`,
    `Typed ${inserted} characters, deleted ${deleted}; final code is ${lastCode.length} characters`,
    `Pauses longer than 45 seconds: ${pauses.length ? pauses.map(([a, b]) => `${mmss(a)}→${mmss(b)}`).join(', ') : 'none'}`,
  ];
  return { stats: stats.join('\n'), timeline: lines.join('\n\n'), finalCode: lastCode };
}

const HEADINGS = {
  en: ['Verdict', 'What happened', 'Where the lack of fluency showed', 'Correctness and complexity', 'Communication', 'What to practice next'],
  zh: ['结论', '过程回顾', '暴露出的不熟练', '正确性与复杂度', '沟通', '接下来练什么'],
};

export async function writeReview({ problem, langLabel, events, starter, locale = 'zh' }) {
  const d = buildDigest(events, starter);
  const h = HEADINGS[locale] || HEADINGS.en;
  const prompt = `You are a senior interviewer who has just finished running a coding interview. Below is the full record. Write a review addressed to the candidate.

The candidate relies heavily on AI to write code at work and is doing these mock interviews to get back the ability to write code by hand. They want specific, direct feedback. No pleasantries, no encouragement, no slogans.

Write the review in ${SPEAK_LANG[locale] || SPEAK_LANG.en}.

# Problem: ${problem.title}

${problem.stages.map((s, i) => `## Stage ${i + 1}\n\n${s}`).join('\n\n')}

# Interviewer notes for the problem

${problem.interviewerNotes || '(none)'}

# Reference solution

\`\`\`
${problem.solution}
\`\`\`

# Statistics

Language: ${langLabel}
${d.stats}

# Timeline (code changes are diffs; times are minutes:seconds since the start)

${d.timeline}

# Final code

\`\`\`
${d.finalCode}
\`\`\`

# What to write

Markdown with exactly these sections:

## ${h[0]}
One sentence: the outcome (strong hire / hire / borderline / no hire) and the main reason.

## ${h[1]}
In time order, how the candidate worked: thinking first or typing first, whether the code was written in a sensible order, where the time went. Cite specific timestamps.

## ${h[2]}
Evidence from the edit history: places rewritten more than once, syntax or library usage that was wrong before it was right, long pauses, how each bug was introduced and how it was fixed. Give the timestamp and the code for each item. Do not write anything you have no evidence for.

## ${h[3]}
Whether the final code is correct, its complexity, how it differs from the reference solution, edge cases it misses.

## ${h[4]}
Whether the candidate clarified requirements, explained the approach, and how well they answered the interviewer's questions. Count the hints used.

## ${h[5]}
At most three items, each a concrete exercise the candidate can do.`;
  return oneShot(prompt, { model: DEEP_MODEL });
}
