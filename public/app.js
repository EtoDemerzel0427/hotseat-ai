import { marked } from '/lib/marked.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mmss = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const store = {
  get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 忽略 */ } },
};
const api = async (url, body) => {
  const r = await fetch(url, body && { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
};

// ---------- 文案 ----------
const I18N = {
  zh: {
    heroTitle: '有面试官在场的编码练习', heroSub: '本地运行的面试练习。面试官由 Claude 担任，全程看着你写，结束后根据完整的改动历史给出复盘。',
    problems: '题库', generate: '新题：和 Claude 一起打磨', history: '历史记录',
    genPlaceholder: '想出一道什么题？例如：LRU 缓存，中等，两个阶段（留空则由 Claude 提议）', genButton: '进入工作台',
    workshop: '工作台', files: '文件', validate: '校验', publish: '发布到题库', deleteDraft: '删除草稿', preview: '预览', save: '保存', stop: '停止', edit: '编辑', draft: '草稿',
    shopPlaceholder: '告诉 Claude 要怎么改这道题。Enter 发送，Shift+Enter 换行', valid: '校验通过', invalid: '校验未通过', notChecked: '未校验', validating: '校验中…',
    stopped: '已停止。', confirmDelete: '删除这份草稿？', published: '已发布到题库。', newProblemMsg: (topic, diff) => `出一道新题。${topic ? `要求：${topic}。` : '方向由你提议。'}难度：${diff}。`,
    uploadHint: '也可以自己加题：在 <code>problems/</code> 下按同样的目录结构放一个文件夹，刷新即可。',
    easy: '简单', medium: '中等', hard: '困难', stages: (n) => `${n} 个阶段`, mins: (n) => `${n} 分钟`,
    startArrow: '开始 →', noProblems: '题库是空的。', noHistory: '还没有记录。',
    codeLang: '编程语言', interviewLang: '面试语言（题面和面试官）', duration: '时长', cancel: '取消', start: '开始面试',
    viewReview: '查看复盘', makeReview: '生成复盘', making: '生成中…',
    run: '运行', runTitle: '用下方的自定义输入运行', runTests: '运行测试', end: '结束面试',
    problem: '题目', code: '代码', testResults: '测试结果', customRun: '自定义运行', stdin: '输入 (stdin)', output: '输出',
    interviewer: '面试官', chatPlaceholder: '对面试官说话：提问、讲思路。Enter 发送，Shift+Enter 换行',
    review: '复盘', backHome: '返回首页', preparing: '正在准备…',
    noRuns: '还没有运行过测试。', running: '编译运行中…', compileFail: '编译失败', passedOf: (p, t) => `${p} / ${t} 通过`,
    sPass: '通过', sTle: '超时', sRe: '崩溃', sWa: '错误', hidden: '隐藏用例', warnings: '编译警告', warn: '警告',
    input: '输入', expected: '期望输出', yours: '你的输出',
    exit: (c) => `exit ${c}`, timeout5: '超时 (5s)',
    stageN: (i, n) => `阶段 ${i} / ${n}`, stageShown: (i) => `阶段 ${i} 的需求已显示在题面下方`,
    you: '你', hintTag: '提示', voiceTag: '语音', listening: '正在听…', hearing: '你在说话…', transcribing: '正在转写…', loadingModel: '正在加载识别模型…',
    micTitle: '麦克风：你说的话由本地 Whisper 转成文字发给面试官', ttsTitle: '朗读面试官的话',
    noMic: '这个浏览器不支持录音。', sttOff: '语音识别还没有安装。在项目目录运行 npx hotseat-ai setup-voice，然后重启。', micDenied: '无法使用麦克风。请在浏览器地址栏里允许本页使用麦克风。',
    confirmEnd: '结束这场面试并生成复盘？', reviewing: '面试已结束，正在根据完整的改动历史写复盘，通常需要一分钟左右…',
    disconnected: '与本地服务的连接断开了，本场面试已结束并保存。',
  },
  en: {
    heroTitle: 'Coding practice with an interviewer in the room', heroSub: 'Mock interviews that run locally. Claude is the interviewer: it watches you write the whole time and reviews your full edit history afterwards.',
    problems: 'Problems', generate: 'New problem: draft it with Claude', history: 'History',
    genPlaceholder: 'What problem do you want? e.g. LRU cache, medium, two stages (leave empty and Claude will propose one)', genButton: 'Open workshop',
    workshop: 'Workshop', files: 'Files', validate: 'Validate', publish: 'Publish', deleteDraft: 'Delete draft', preview: 'Preview', save: 'Save', stop: 'Stop', edit: 'Edit', draft: 'Draft',
    shopPlaceholder: 'Tell Claude how to change this problem. Enter to send, Shift+Enter for a new line', valid: 'Valid', invalid: 'Invalid', notChecked: 'Not validated', validating: 'Validating…',
    stopped: 'Stopped.', confirmDelete: 'Delete this draft?', published: 'Published to the problem list.', newProblemMsg: (topic, diff) => `Write a new problem. ${topic ? `Requirements: ${topic}.` : 'Propose the topic yourself.'} Difficulty: ${diff}.`,
    uploadHint: 'You can also add your own: drop a folder with the same layout into <code>problems/</code> and reload.',
    easy: 'Easy', medium: 'Medium', hard: 'Hard', stages: (n) => `${n} stage${n > 1 ? 's' : ''}`, mins: (n) => `${n} min`,
    startArrow: 'Start →', noProblems: 'No problems yet.', noHistory: 'No sessions yet.',
    codeLang: 'Programming language', interviewLang: 'Interview language (statement and interviewer)', duration: 'Duration', cancel: 'Cancel', start: 'Start interview',
    viewReview: 'View review', makeReview: 'Generate review', making: 'Generating…',
    run: 'Run', runTitle: 'Run with the custom input below', runTests: 'Run tests', end: 'End interview',
    problem: 'Problem', code: 'Code', testResults: 'Test results', customRun: 'Custom run', stdin: 'Input (stdin)', output: 'Output',
    interviewer: 'Interviewer', chatPlaceholder: 'Talk to the interviewer: ask questions, explain your approach. Enter to send, Shift+Enter for a new line',
    review: 'Review', backHome: 'Back to home', preparing: 'Preparing…',
    noRuns: 'No test runs yet.', running: 'Compiling and running…', compileFail: 'Compilation failed', passedOf: (p, t) => `${p} / ${t} passed`,
    sPass: 'Pass', sTle: 'Timeout', sRe: 'Crash', sWa: 'Wrong', hidden: 'hidden', warnings: 'Compiler warnings', warn: 'Warn',
    input: 'Input', expected: 'Expected', yours: 'Your output',
    exit: (c) => `exit ${c}`, timeout5: 'timeout (5s)',
    stageN: (i, n) => `Stage ${i} / ${n}`, stageShown: (i) => `Stage ${i} is now shown below the statement`,
    you: 'You', hintTag: 'hint', voiceTag: 'voice', listening: 'Listening…', hearing: 'Hearing you…', transcribing: 'Transcribing…', loadingModel: 'Loading the speech model…',
    micTitle: 'Microphone: local Whisper transcribes what you say and sends it to the interviewer', ttsTitle: 'Read the interviewer aloud',
    noMic: 'This browser cannot record audio.', sttOff: 'Speech-to-text is not set up. Run "npx hotseat-ai setup-voice" in the project folder and restart.', micDenied: 'Cannot use the microphone. Allow microphone access for this page in the address bar.',
    confirmEnd: 'End this interview and generate the review?', reviewing: 'Interview ended. Writing the review from your full edit history; this usually takes about a minute…',
    disconnected: 'Lost the connection to the local server. This interview has ended and was saved.',
  },
};
let ui = store.get('ui', (navigator.language || '').startsWith('zh') ? 'zh' : 'en');
const t = (k, ...a) => { const v = I18N[ui][k] ?? I18N.en[k] ?? k; return typeof v === 'function' ? v(...a) : v; };

function applyI18n() {
  document.documentElement.lang = ui === 'zh' ? 'zh-CN' : 'en';
  for (const el of $$('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of $$('[data-i18n-html]')) el.innerHTML = t(el.dataset.i18nHtml);
  for (const el of $$('[data-i18n-ph]')) el.placeholder = t(el.dataset.i18nPh);
  for (const el of $$('[data-i18n-title]')) el.title = t(el.dataset.i18nTitle);
  for (const b of $$('#ui-lang button')) b.classList.toggle('active', b.dataset.v === ui);
}
for (const b of $$('#ui-lang button')) b.onclick = () => { ui = b.dataset.v; store.set('ui', ui); applyI18n(); loadHome(); };

function show(view) { for (const v of $$('.view')) v.classList.toggle('hidden', v.id !== view); }
let toastTimer;
function toast(text, ms = 4000) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

// ---------- Monaco：主题与更细的高亮 ----------
const STD_TYPES = 'string|string_view|vector|deque|list|forward_list|array|map|multimap|unordered_map|unordered_multimap|set|multiset|unordered_set|pair|tuple|optional|variant|function|unique_ptr|shared_ptr|weak_ptr|queue|priority_queue|stack|span|size_t|ptrdiff_t|u?int(?:8|16|32|64)_t|u?intptr_t|istringstream|ostringstream|stringstream|ostream|istream|greater|less|hash|iterator|const_iterator|numeric_limits|atomic|mutex|thread|bitset';

function tuneLanguage(monaco, id, modulePath, rules) {
  monaco.languages.onLanguage(id, () => {
    window.require([modulePath], (m) => setTimeout(() => {
      const lang = { ...m.language, tokenizer: { ...m.language.tokenizer, root: [...rules, ...m.language.tokenizer.root] } };
      monaco.languages.setMonarchTokensProvider(id, lang);
    }, 30));
  });
}

const monacoReady = new Promise((resolve) => {
  window.require.config({ paths: { vs: '/vs' } });
  window.require(['vs/editor/editor.main'], () => {
    const monaco = window.monaco;
    monaco.editor.defineTheme('mock-dark', {
      base: 'vs-dark', inherit: true,
      rules: [
        { token: '', foreground: 'dde1ea' },
        { token: 'comment', foreground: '596277', fontStyle: 'italic' },
        { token: 'keyword', foreground: '8c9dff' },
        { token: 'keyword.directive', foreground: 'c594f5' },
        { token: 'keyword.directive.include', foreground: 'c594f5' },
        { token: 'string', foreground: 'a3d995' },
        { token: 'string.include.identifier', foreground: 'a3d995' },
        { token: 'string.escape', foreground: '6fd3c7' },
        { token: 'number', foreground: 'f2a477' },
        { token: 'type', foreground: '63d2c6' },
        { token: 'namespace', foreground: '8fa3bd' },
        { token: 'function', foreground: 'ecc582' },
        { token: 'identifier', foreground: 'dde1ea' },
        { token: 'delimiter', foreground: '8d96a8' },
        { token: 'operator', foreground: 'a9b2c4' },
        { token: 'annotation', foreground: 'c594f5' },
      ],
      colors: {
        'editor.background': '#111318', 'editor.foreground': '#dde1ea', 'editorGutter.background': '#111318',
        'editor.lineHighlightBackground': '#171a21', 'editor.lineHighlightBorder': '#00000000',
        'editorLineNumber.foreground': '#3a4150', 'editorLineNumber.activeForeground': '#9aa3b5',
        'editor.selectionBackground': '#7b8cff44', 'editor.inactiveSelectionBackground': '#7b8cff22', 'editor.selectionHighlightBackground': '#7b8cff1c',
        'editor.wordHighlightBackground': '#7b8cff1c', 'editor.findMatchBackground': '#efb54a55', 'editor.findMatchHighlightBackground': '#efb54a2a',
        'editorCursor.foreground': '#9aa7ff',
        'editorIndentGuide.background1': '#1b1f27', 'editorIndentGuide.activeBackground1': '#333a48',
        'editorBracketMatch.background': '#7b8cff2a', 'editorBracketMatch.border': '#00000000',
        'editorBracketHighlight.foreground1': '#9aa3b5', 'editorBracketHighlight.foreground2': '#b7a6f5', 'editorBracketHighlight.foreground3': '#7fc8e8',
        'scrollbarSlider.background': '#2e344088', 'scrollbarSlider.hoverBackground': '#444b5a99', 'scrollbarSlider.activeBackground': '#59617299',
        'editorWidget.background': '#171a21', 'editorWidget.border': '#2e3440', 'editorSuggestWidget.background': '#171a21',
        'editorSuggestWidget.border': '#2e3440', 'editorSuggestWidget.selectedBackground': '#252a35', 'editorHoverWidget.background': '#171a21',
        'input.background': '#0a0b0e', 'focusBorder': '#7b8cff', 'editorOverviewRuler.border': '#00000000',
        'editorStickyScroll.background': '#111318', 'scrollbar.shadow': '#00000000',
      },
    });
    tuneLanguage(monaco, 'cpp', 'vs/basic-languages/cpp/cpp', [
      [/\bstd(?=\s*::)/, 'namespace'],
      [new RegExp(`\\b(?:${STD_TYPES})\\b`), 'type'],
      [/\b[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9_]*\b/, 'type'],
      [/[a-zA-Z_]\w*(?=\s*\()/, { cases: { '@keywords': { token: 'keyword.$0' }, '@default': 'function' } }],
    ]);
    tuneLanguage(monaco, 'python', 'vs/basic-languages/python/python', [
      [/\b[A-Z][A-Za-z0-9]*[a-z][A-Za-z0-9_]*\b/, 'type'],
      [/[a-zA-Z_]\w*(?=\s*\()/, { cases: { '@keywords': 'keyword', '@default': 'function' } }],
    ]);
    document.fonts?.ready.then(() => monaco.editor.remeasureFonts());
    resolve(monaco);
  });
});

const EDITOR_OPTIONS = {
  theme: 'mock-dark', automaticLayout: true,
  fontFamily: '"JetBrains Mono Variable", "SF Mono", Menlo, monospace', fontSize: 13.5, lineHeight: 22, fontLigatures: false, letterSpacing: 0,
  padding: { top: 14, bottom: 14 }, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4,
  smoothScrolling: true, cursorBlinking: 'smooth', cursorSmoothCaretAnimation: 'on', cursorWidth: 2,
  renderLineHighlight: 'line', roundedSelection: true, lineNumbersMinChars: 3, lineDecorationsWidth: 14,
  bracketPairColorization: { enabled: true }, guides: { indentation: true, bracketPairs: 'active' },
  scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10, useShadows: false },
  overviewRulerBorder: false, hideCursorInOverviewRuler: true, stickyScroll: { enabled: false }, contextmenu: false,
};

// ---------- 首页 ----------
let langs = {}, allProblems = [], appConfig = { stt: true, tts: 'edge' };
api('/api/config').then((c) => { appConfig = c; $('#btn-tts').classList.toggle('hidden', c.tts === 'off'); if (c.tts === 'off') setTts(false); }).catch(() => {});

async function loadHome() {
  show('home');
  applyI18n();
  const data = await api('/api/problems');
  langs = data.langs;
  const order = { easy: 0, medium: 1, hard: 2 };
  const problems = data.problems.sort((a, b) => (order[a.difficulty] ?? 9) - (order[b.difficulty] ?? 9));
  allProblems = problems;
  $('#problem-count').textContent = problems.length || '';
  $('#problems').innerHTML = problems.length ? '' : `<div class="empty">${t('noProblems')}</div>`;
  for (const p of problems) {
    const el = document.createElement('div');
    el.className = `card${p.draft ? ' draft' : ''}`;
    el.innerHTML = `
      <h3>${esc(p.title[ui] || p.title.en || p.title.zh)}</h3>
      <div class="tags">
        ${p.draft ? `<span class="pill">${t('draft')}</span>` : ''}
        ${p.difficulty ? `<span class="pill ${esc(p.difficulty)}">${t(p.difficulty)}</span>` : ''}
        ${p.stages ? `<span class="pill">${t('stages', p.stages)}</span><span class="pill">${t('mins', p.minutes)}</span>` : ''}
      </div>
      <div class="go"><span>${p.langs.map((l) => esc(langs[l])).join(' · ')}</span><button class="ghost edit">${t('edit')}</button>${p.draft ? '' : `<b>${t('startArrow')}</b>`}</div>`;
    el.onclick = () => (p.draft ? openShop(p) : openSetup(p));
    el.querySelector('.edit').onclick = (ev) => { ev.stopPropagation(); openShop(p); };
    $('#problems').append(el);
  }

  const sessions = await api('/api/sessions');
  $('#history').innerHTML = sessions.length ? '' : `<div class="empty">${t('noHistory')}</div>`;
  for (const s of sessions) {
    const el = document.createElement('div');
    el.className = 'hist';
    el.innerHTML = `<span class="when">${esc(new Date(s.startedAt).toLocaleString(ui === 'zh' ? 'zh-CN' : 'en-US', { hour12: false, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</span>
      <span class="name">${esc(s.title)}</span>
      <span class="pill">${esc(langs[s.lang] || s.lang)}</span>
      <button>${t(s.hasReview ? 'viewReview' : 'makeReview')}</button>`;
    el.querySelector('button').onclick = async (ev) => {
      const btn = ev.currentTarget;
      btn.disabled = true;
      try {
        let { md } = await api(`/api/sessions/${s.id}/review`);
        if (!md) { btn.textContent = t('making'); ({ md } = await api(`/api/sessions/${s.id}/review`, {})); }
        showReview(md);
      } catch (e) { toast(e.message); }
      btn.disabled = false;
    };
    $('#history').append(el);
  }
}

function openSetup(p) {
  const dlg = $('#setup');
  $('#setup-title').textContent = p.title[ui] || p.title.en;
  $('#setup-meta').textContent = `${t(p.difficulty)} · ${t('stages', p.stages)}`;
  $('#setup-lang').innerHTML = p.langs.map((l) => `<option value="${l}">${esc(langs[l])}</option>`).join('');
  const savedLang = store.get('lang');
  if (p.langs.includes(savedLang)) $('#setup-lang').value = savedLang;
  $('#setup-locale').value = store.get('locale', ui);
  const opts = [...new Set([20, 30, 45, 60, 90, 120, p.minutes])].sort((a, b) => a - b);
  $('#setup-minutes').innerHTML = opts.map((m) => `<option value="${m}" ${m === p.minutes ? 'selected' : ''}>${t('mins', m)}</option>`).join('');
  dlg.onclose = () => {
    if (dlg.returnValue !== 'start') return;
    const lang = $('#setup-lang').value, locale = $('#setup-locale').value;
    store.set('lang', lang);
    store.set('locale', locale);
    startInterview(p.slug, lang, locale, Number($('#setup-minutes').value));
  };
  dlg.returnValue = '';
  dlg.showModal();
}

$('#gen').onsubmit = async (ev) => {
  ev.preventDefault();
  try {
    const { slug } = await api('/api/drafts', {});
    const msg = t('newProblemMsg', $('#gen-topic').value.trim(), t($('#gen-diff').value));
    $('#gen-topic').value = '';
    openShop({ slug, draft: true, title: { zh: '未命名草稿', en: 'Untitled draft' } }, msg);
  } catch (e) { toast(e.message); }
};

// ---------- 题目工作台 ----------
let shopStopped = false, shopWs = null, shop = null, shopEditor = null, shopBusy = false, shopLoading = false;
const MONACO_LANG = { md: 'markdown', json: 'json', cpp: 'cpp', py: 'python' };
const shopSend = (obj) => { if (shopWs?.readyState === 1) shopWs.send(JSON.stringify(obj)); };

function shopMsg(kind, html) {
  const log = $('#shop-log');
  const el = document.createElement('div');
  el.className = `msg ${kind}`;
  el.innerHTML = kind === 'tool' || kind === 'sys' ? html : `<div class="bubble${kind === 'ai' ? ' md' : ''}">${html}</div>`;
  log.append(el);
  log.scrollTop = log.scrollHeight;
}

function setShopStatus(state, message) {
  const el = $('#shop-status');
  el.className = `pill ${state === 'ok' ? 'ok' : state === 'bad' ? 'bad' : ''}`;
  el.textContent = t(state === 'ok' ? 'valid' : state === 'bad' ? 'invalid' : state === 'busy' ? 'validating' : 'notChecked');
  el.title = message || '';
}

function setShopBusy(on) {
  shopBusy = on;
  $('#shop-typing').classList.toggle('hidden', !on);
  $('#shop-stop').classList.toggle('hidden', !on);
  $('#shop-send').classList.toggle('hidden', on);
}

function renderShopFiles(files) {
  shop.files = files;
  const box = $('#shop-files');
  box.innerHTML = '';
  let prev = '';
  for (const f of files) {
    const group = f.split('.')[0].replace(/\d+$/, '');
    if (prev && group !== prev && !(prev === 'statement' && group === 'stage')) box.insertAdjacentHTML('beforeend', '<div class="sep"></div>');
    prev = group;
    const b = document.createElement('button');
    b.textContent = f;
    b.classList.toggle('active', f === shop.file);
    b.onclick = () => openShopFile(f);
    box.append(b);
  }
}

async function saveShopFile() {
  if (!shop?.file || !shop.dirty) return;
  await api(`/api/problems/${shop.slug}/file`, { name: shop.file, content: shopEditor.getValue() });
  shop.dirty = false;
  $('#shop-dirty').classList.add('hidden');
  setShopStatus('none');
}

async function openShopFile(name, { reload = false } = {}) {
  const monaco = await monacoReady;
  if (!reload) await saveShopFile().catch((e) => toast(e.message));
  let content = '';
  try { ({ content } = await api(`/api/problems/${shop.slug}/file?name=${encodeURIComponent(name)}`)); } catch { return; }
  if (reload && content === shopEditor?.getValue()) return;
  shop.file = name;
  shop.dirty = false;
  $('#shop-dirty').classList.add('hidden');
  $('#shop-file-name').textContent = name;
  const ext = name.split('.').pop();
  const isMd = ext === 'md';
  $('#shop-preview-btn').classList.toggle('hidden', !isMd);
  if (!isMd) shop.preview = false;
  if (!shopEditor) {
    shopEditor = monaco.editor.create($('#shop-editor'), { ...EDITOR_OPTIONS, wordWrap: 'on', value: '', language: 'markdown' });
    shopEditor.onDidChangeModelContent(() => {
      if (shopLoading) return;
      shop.dirty = true;
      $('#shop-dirty').classList.remove('hidden');
      if (shop.preview) $('#shop-preview').innerHTML = marked.parse(shopEditor.getValue());
    });
    shopEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveShopFile().catch((e) => toast(e.message)));
  }
  shopLoading = true;
  const view = reload ? shopEditor.saveViewState() : null;
  shopEditor.setValue(content);
  monaco.editor.setModelLanguage(shopEditor.getModel(), MONACO_LANG[ext] || 'plaintext');
  if (view) shopEditor.restoreViewState(view);
  shopLoading = false;
  applyShopPreview();
  for (const b of $$('#shop-files button')) b.classList.toggle('active', b.textContent === name);
}

function applyShopPreview() {
  const on = !!shop.preview;
  $('#shop-preview').classList.toggle('hidden', !on);
  $('#shop-editor').classList.toggle('hidden', on);
  $('#shop-preview-btn').classList.toggle('on', on);
  if (on) $('#shop-preview').innerHTML = marked.parse(shopEditor.getValue());
}
$('#shop-preview-btn').onclick = () => { shop.preview = !shop.preview; applyShopPreview(); };
$('#shop-save').onclick = () => saveShopFile().catch((e) => toast(e.message));

// 助手改完文件后刷新；当前文件有未保存的手动修改时不覆盖。
function refreshShop(files) {
  if (files?.length) renderShopFiles(files);
  if (!shop.file && shop.files.length) openShopFile(shop.files.find((f) => f === `statement.${ui}.md`) || shop.files[0]);
  else if (shop.file && !shop.dirty) openShopFile(shop.file, { reload: true });
}

function openShop(p, firstMsg) {
  show('shop');
  shop = { slug: p.slug, draft: !!p.draft, files: [], file: null, dirty: false, preview: false };
  $('#shop-title').textContent = p.title[ui] || p.title.en;
  $('#shop-log').innerHTML = '';
  $('#shop-files').innerHTML = '';
  $('#shop-file-name').textContent = '';
  $('#shop-publish').classList.toggle('hidden', !shop.draft);
  $('#shop-delete').classList.toggle('hidden', !shop.draft);
  if (shopEditor) { shopLoading = true; shopEditor.setValue(''); shopLoading = false; }
  setShopStatus('none');
  setShopBusy(false);
  shopWs = new WebSocket(`ws://${location.host}/ws-author`);
  const sock = shopWs;
  sock.onopen = () => shopSend({ t: 'open', slug: p.slug });
  sock.onmessage = (ev) => {
    if (sock !== shopWs) return;
    const m = JSON.parse(ev.data);
    switch (m.t) {
      case 'opened':
        refreshShop(m.files);
        if (firstMsg) sendShopChat(firstMsg);
        break;
      case 'text': shopMsg('ai', marked.parse(m.text)); break;
      case 'tool': shopMsg('tool', `${esc(m.name.toLowerCase())}${m.file ? ` <b>${esc(m.file)}</b>` : ''}`); break;
      case 'files': refreshShop(m.files); break;
      case 'validation': setShopStatus(m.ok ? 'ok' : 'bad', m.message); break;
      case 'turnEnd':
        setShopBusy(false);
        if (shopStopped) shopMsg('sys', t('stopped')); else if (m.error) shopMsg('sys', esc(m.error));
        shopStopped = false;
        refreshShop(m.files);
        break;
    }
  };
}

function sendShopChat(text) {
  if (!text || shopBusy) return;
  saveShopFile().catch(() => {}).then(() => {
    shopMsg('me', esc(text));
    setShopBusy(true);
    shopSend({ t: 'chat', text });
  });
}
function shopSubmit() {
  const box = $('#shop-input');
  const text = box.value.trim();
  if (!text || shopBusy) return;
  box.value = '';
  sendShopChat(text);
}
$('#shop-input').addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return;
  ev.preventDefault();
  shopSubmit();
});
$('#shop-send').onclick = shopSubmit;
$('#shop-stop').onclick = () => { shopStopped = true; shopSend({ t: 'stop' }); };

$('#shop-validate').onclick = async () => {
  await saveShopFile().catch((e) => toast(e.message));
  setShopStatus('busy');
  try {
    const v = await api(`/api/problems/${shop.slug}/validate`, {});
    setShopStatus(v.ok ? 'ok' : 'bad', v.message);
    shopMsg('sys', esc(v.message));
  } catch (e) { setShopStatus('bad', e.message); }
};
function closeShop() {
  const sock = shopWs;
  shopWs = null;
  try { sock?.close(); } catch { /* 已关闭 */ }
}
$('#shop-publish').onclick = async () => {
  await saveShopFile().catch(() => {});
  setShopStatus('busy');
  try {
    await api(`/api/problems/${shop.slug}/publish`, {});
    closeShop();
    await loadHome();
    toast(t('published'));
  } catch (e) { setShopStatus('bad', e.message); shopMsg('sys', esc(e.message)); }
};
$('#shop-delete').onclick = async () => {
  if (!confirm(t('confirmDelete'))) return;
  closeShop();
  await api(`/api/problems/${shop.slug}/delete`, {}).catch((e) => toast(e.message));
  loadHome();
};
$('#shop-back').onclick = async () => {
  await saveShopFile().catch(() => {});
  closeShop();
  loadHome().catch((e) => toast(e.message));
};

// ---------- 可拖动的分栏 ----------
for (const k of ['--left', '--right', '--console']) {
  const v = store.get(`size${k}`);
  if (v) $('#cols').style.setProperty(k, v);
}
for (const g of $$('.gutter')) {
  g.addEventListener('pointerdown', (ev) => {
    const row = g.classList.contains('row'), key = g.dataset.var, dir = Number(g.dataset.dir);
    const start = row ? ev.clientY : ev.clientX;
    const base = parseFloat(getComputedStyle($('#cols')).getPropertyValue(key));
    g.classList.add('drag');
    g.setPointerCapture(ev.pointerId);
    const move = (e) => {
      const max = row ? window.innerHeight - 260 : window.innerWidth * 0.45;
      const v = Math.min(max, Math.max(row ? 90 : 240, base + dir * ((row ? e.clientY : e.clientX) - start)));
      $('#cols').style.setProperty(key, `${v}px`);
    };
    const up = () => {
      g.classList.remove('drag');
      g.removeEventListener('pointermove', move);
      store.set(`size${key}`, $('#cols').style.getPropertyValue(key));
    };
    g.addEventListener('pointermove', move);
    g.addEventListener('pointerup', up, { once: true });
  });
}

// ---------- 面试房间 ----------
let ws = null, editor = null, t0 = 0, minutes = 45, timerId = null, live = false, syncTimer = null, totalStages = 1;

const wsSend = (obj) => { if (ws?.readyState === 1) ws.send(JSON.stringify(obj)); };
const code = () => editor.getValue();

function addMsg(kind, text, speakKind, voice) {
  const el = document.createElement('div');
  el.className = `msg ${kind}${speakKind === 'hint' ? ' hint' : ''}`;
  if (kind === 'sys') el.textContent = text;
  else el.innerHTML = `<span class="at" data-tag="${t('hintTag')}">${kind === 'iv' ? t('interviewer') : t('you')} · ${mmss(Date.now() - t0)}${voice ? ` · <span class="v">${t('voiceTag')}</span>` : ''}</span><div class="bubble">${esc(text)}</div>`;
  $('#chat-log').append(el);
  $('#chat-log').scrollTop = $('#chat-log').scrollHeight;
}

function setStage(i) { $('#stage-badge').textContent = t('stageN', i + 1, totalStages); }

function selectTab(name) {
  for (const b of $$('.tabs button')) b.classList.toggle('active', b.dataset.tab === name);
  $('#tab-tests').classList.toggle('hidden', name !== 'tests');
  $('#tab-custom').classList.toggle('hidden', name !== 'custom');
}
for (const b of $$('.tabs button')) b.onclick = () => selectTab(b.dataset.tab);

async function startInterview(slug, lang, locale, mins) {
  const monaco = await monacoReady;
  roomLocale = locale;
  show('room');
  $('#chat-log').innerHTML = '';
  $('#statement').innerHTML = '';
  $('#tab-tests').innerHTML = `<p class="muted">${t('noRuns')}</p>`;
  $('#run-out').textContent = '';
  $('#title').textContent = t('preparing');
  $('#stage-badge').textContent = '';
  selectTab('tests');

  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.onopen = () => wsSend({ t: 'start', slug, lang, locale, minutes: mins });
  ws.onclose = () => { stopVoice(); if (live) { live = false; clearInterval(timerId); toast(t('disconnected'), 8000); } };
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    switch (m.t) {
      case 'started': {
        live = true;
        t0 = Date.now();
        minutes = m.minutes;
        totalStages = m.totalStages;
        $('#title').textContent = m.title;
        $('#lang-badge').textContent = m.langLabel;
        setStage(0);
        $('#statement').innerHTML = marked.parse(m.stages[0]);
        if (editor) editor.dispose();
        $('#editor').innerHTML = '';
        editor = monaco.editor.create($('#editor'), { ...EDITOR_OPTIONS, value: m.starter, language: m.monaco });
        editor.onDidChangeModelContent((e) => {
          wsSend({ t: 'edit', ch: e.changes.map((c) => ({ o: c.rangeOffset, l: c.rangeLength, t: c.text })) });
          clearTimeout(syncTimer);
          syncTimer = setTimeout(() => wsSend({ t: 'code', code: code() }), 1200);
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, runTests);
        editor.focus();
        clearInterval(timerId);
        timerId = setInterval(tick, 500);
        tick();
        break;
      }
      case 'interviewer': addMsg('iv', m.text, m.kind); speak(m.text); break;
      case 'heard': onHeard(m); break;
      case 'micReady': if (micOn) idleCaption(); break;
      case 'micError': setMic(false); toast(m.text, 8000); break;
      case 'busy': $('#typing').classList.toggle('hidden', !m.on); break;
      case 'stage': {
        setStage(m.index);
        $('#statement').insertAdjacentHTML('beforeend', `<hr class="stage-sep" id="stage-${m.index}">${marked.parse(m.md)}`);
        document.getElementById(`stage-${m.index}`).scrollIntoView({ behavior: 'smooth' });
        addMsg('sys', t('stageShown', m.index + 1));
        break;
      }
      case 'runResult': renderRun(m); break;
      case 'testResult': renderTests(m); break;
      case 'reviewing':
        show('review');
        $('#review-body').innerHTML = `<div class="loading"><span class="spin"></span>${t('reviewing')}</div>`;
        break;
      case 'review': showReview(m.md); break;
      case 'error':
        if (m.fatal && !live && $('#review').classList.contains('hidden')) { toast(m.text, 8000); loadHome(); }
        else if (m.fatal) $('#review-body').innerHTML = `<p>${esc(m.text)}</p>`;
        else toast(m.text, 6000);
        break;
    }
  };
}

function tick() {
  const el = $('#timer');
  const ms = Date.now() - t0, total = minutes * 60_000;
  el.querySelector('b').textContent = `${mmss(ms)} / ${minutes}:00`;
  el.classList.toggle('warn', ms > total - 5 * 60_000 && ms <= total);
  el.classList.toggle('over', ms > total);
}

function busyButtons(on) { $('#btn-run').disabled = on; $('#btn-test').disabled = on; }

function runTests() {
  if (!live || $('#btn-test').disabled) return;
  busyButtons(true);
  selectTab('tests');
  $('#tab-tests').innerHTML = `<div class="loading" style="padding:20px 0"><span class="spin"></span>${t('running')}</div>`;
  wsSend({ t: 'test', code: code() });
}
$('#btn-test').onclick = runTests;

$('#btn-run').onclick = () => {
  if (!live) return;
  busyButtons(true);
  selectTab('custom');
  $('#run-out').textContent = t('running');
  wsSend({ t: 'run', code: code(), stdin: $('#stdin').value });
};

function renderRun(m) {
  busyButtons(false);
  const out = $('#run-out');
  if (!m.compile.ok) { out.textContent = `${t('compileFail')}\n\n${m.compile.stderr}`; return; }
  const r = m.run;
  let text = r.stdout;
  if (r.stderr) text += `\n--- stderr ---\n${r.stderr}`;
  text += `\n--- ${r.timedOut ? t('timeout5') : t('exit', r.code ?? r.signal)} · ${r.ms} ms ---`;
  if (m.compile.stderr) text += `\n--- ${t('warnings')} ---\n${m.compile.stderr}`;
  out.textContent = text;
}

function renderTests(m) {
  busyButtons(false);
  const box = $('#tab-tests');
  if (!m.compile.ok) {
    box.innerHTML = `<div class="summary bad">${t('compileFail')}</div><pre class="err">${esc(m.compile.stderr)}</pre>`;
    return;
  }
  const all = m.passed === m.total;
  let html = `<div class="summary ${all ? 'ok' : 'bad'}"><span>${t('passedOf', m.passed, m.total)}</span><span class="dots">${m.results.map((r) => `<i class="${r.pass ? 'p' : ''}"></i>`).join('')}</span></div>`;
  for (const r of m.results) {
    const status = r.pass ? t('sPass') : r.timedOut ? t('sTle') : r.exitCode !== 0 ? t('sRe') : t('sWa');
    const head = `<span class="st ${r.pass ? 'pass' : 'fail'}">${status}</span><span>${esc(r.name)}</span>${r.hidden ? `<span class="lock">${t('hidden')}</span>` : ''}<span class="ms">${r.ms} ms</span>`;
    if (r.hidden) { html += `<div class="case"><summary>${head}</summary></div>`; continue; }
    html += `<details class="case" ${r.pass ? '' : 'open'}><summary>${head}</summary><div class="body">
      <div><h5>${t('input')}</h5><pre>${esc(r.input)}</pre></div>
      <div><h5>${t('expected')}</h5><pre>${esc(r.expected)}</pre></div>
      <div><h5>${t('yours')}</h5><pre>${esc(r.stdout)}${r.stderr ? `\n--- stderr ---\n${esc(r.stderr)}` : ''}</pre></div>
    </div></details>`;
  }
  if (m.compile.stderr) html += `<details class="case"><summary><span class="st warnc">${t('warn')}</span><span>${t('warnings')}</span></summary><pre class="err warn">${esc(m.compile.stderr)}</pre></details>`;
  box.innerHTML = html;
}

function sendChat() {
  const box = $('#chat-input');
  const text = box.value.trim();
  if (!text || !live) return;
  addMsg('me', text);
  wsSend({ t: 'chat', text, code: code() });
  box.value = '';
}
$('#chat-input').addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing) return;
  ev.preventDefault();
  sendChat();
});
$('#chat-send').onclick = sendChat;

$('#btn-end').onclick = () => {
  if (!live) return;
  if (!confirm(t('confirmEnd'))) return;
  live = false;
  clearInterval(timerId);
  stopVoice();
  wsSend({ t: 'end', code: code() });
};

// ---------- 语音：麦克风录音分段 → 本地 Whisper；面试官的话 → edge-tts ----------
let roomLocale = 'en', micOn = false, speaking = false, mic = null, pendingHeard = 0, player = null;
let ttsOn = store.get('tts', '0') === '1';
const SAMPLE_RATE = 16000, FRAME_MS = 1000 * 128 / SAMPLE_RATE;
const WORKLET = `class P extends AudioWorkletProcessor{process(i){const c=i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('pcm',P)`;

function showCaption(text) {
  const el = $('#caption');
  el.classList.toggle('hidden', !micOn);
  el.querySelector('span').innerHTML = `<em>${esc(text)}</em>`;
}
const idleCaption = () => showCaption(pendingHeard ? t('transcribing') : t('listening'));

function encodeWav(chunks, total) {
  const buf = new ArrayBuffer(44 + total * 2), v = new DataView(buf);
  const str = (o, s) => { for (let k = 0; k < s.length; k++) v.setUint8(o + k, s.charCodeAt(k)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + total * 2, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true); v.setUint32(28, SAMPLE_RATE * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, total * 2, true);
  let o = 44;
  for (const c of chunks) for (let k = 0; k < c.length; k++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, c[k])) * 0x7fff, true);
  return buf;
}

// 按音量切分：连续有声算开始，静音超过 0.9 秒算一句话结束，整句发给服务端转写。
function makeSegmenter(onUtterance) {
  const PRE = Math.round(300 / FRAME_MS), END = Math.round(900 / FRAME_MS), MIN_VOICED = Math.round(250 / FRAME_MS), MAX = Math.round(25000 / FRAME_MS);
  let floor = 0.004, pre = [], cur = null, voiced = 0, quiet = 0, run = 0;
  return (frame) => {
    if (speaking) { cur = null; pre = []; run = 0; return; } // 面试官朗读时不收音
    let sum = 0;
    for (let k = 0; k < frame.length; k++) sum += frame[k] * frame[k];
    const rms = Math.sqrt(sum / frame.length), loud = rms > Math.max(0.012, floor * 3.5);
    if (!cur) {
      if (!loud) floor = floor * 0.98 + rms * 0.02;
      pre.push(frame);
      if (pre.length > PRE) pre.shift();
      run = loud ? run + 1 : 0;
      if (run >= 5) { cur = pre; pre = []; voiced = run; quiet = 0; run = 0; showCaption(t('hearing')); }
      return;
    }
    cur.push(frame);
    if (loud) { voiced++; quiet = 0; } else quiet++;
    if (quiet >= END || cur.length >= MAX) {
      const frames = cur;
      cur = null;
      if (voiced >= MIN_VOICED) onUtterance(frames); else idleCaption();
    }
  };
}

async function startMic() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
  const ctx = new AudioContext({ sampleRate: SAMPLE_RATE });
  await ctx.audioWorklet.addModule(URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' })));
  const node = new AudioWorkletNode(ctx, 'pcm');
  const feed = makeSegmenter((frames) => {
    if (!live) return;
    pendingHeard++;
    idleCaption();
    ws.send(encodeWav(frames, frames.reduce((n, f) => n + f.length, 0)));
  });
  node.port.onmessage = (e) => feed(e.data);
  ctx.createMediaStreamSource(stream).connect(node);
  mic = { stream, ctx };
}

async function setMic(on) {
  if (on === micOn) return;
  if (!on) {
    micOn = false;
    $('#btn-mic').classList.remove('on');
    $('#caption').classList.add('hidden');
    mic?.stream.getTracks().forEach((tr) => tr.stop());
    mic?.ctx.close();
    mic = null;
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) { toast(t('noMic'), 7000); return; }
  try { await startMic(); } catch (e) { toast(`${t('micDenied')} (${e.name})`, 7000); return; }
  micOn = true;
  pendingHeard = 0;
  $('#btn-mic').classList.add('on');
  showCaption(t('loadingModel'));
  wsSend({ t: 'mic', on: true });
}
$('#btn-mic').onclick = () => {
  if (!live) return;
  if (!micOn && !appConfig.stt) { toast(`${t('sttOff')} (${appConfig.sttReason})`, 9000); return; }
  setMic(!micOn);
};

function onHeard(m) {
  pendingHeard = Math.max(0, pendingHeard - 1);
  if (m.error) toast(m.error, 6000);
  else if (m.text) addMsg('me', m.text, null, true);
  if (micOn) idleCaption();
}

// 面试官的话排队朗读，一句读完再读下一句。
const speakQueue = [];
function speak(text) {
  if (!ttsOn) return;
  speakQueue.push(text);
  if (!player) playNext();
}
function playNext() {
  const text = speakQueue.shift();
  if (!text) { player = null; speaking = false; return; }
  player = new Audio(`/api/tts?locale=${roomLocale}&text=${encodeURIComponent(text)}`);
  speaking = true;
  // 读完后多等一小会儿再恢复收音，避开扬声器的尾音。
  const done = () => { if (player) { player = null; setTimeout(() => { if (!player) playNext(); }, 250); } };
  player.onended = done;
  player.onerror = done;
  player.play().catch(done);
}

function setTts(on) {
  ttsOn = on;
  store.set('tts', on ? '1' : '0');
  $('#btn-tts').classList.toggle('on', on);
  if (!on) stopSpeaking();
}
function stopSpeaking() {
  speakQueue.length = 0;
  if (player) { player.onended = player.onerror = null; player.pause(); player = null; }
  speaking = false;
}
$('#btn-tts').onclick = () => setTts(!ttsOn);
setTts(ttsOn);

function stopVoice() {
  setMic(false);
  stopSpeaking();
}

window.addEventListener('beforeunload', (ev) => { if (live) ev.preventDefault(); });

// ---------- 复盘 ----------
function showReview(md) {
  show('review');
  $('#review-body').innerHTML = marked.parse(md);
  $('.review-scroll').scrollTop = 0;
  try { ws?.close(); } catch { /* 已关闭 */ }
}
$('#btn-home').onclick = () => loadHome().catch((e) => toast(e.message));

applyI18n();
loadHome().catch((e) => toast(e.message));
