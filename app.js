'use strict';
const $ = (id) => document.getElementById(id);
let projects = [], dailyProjects = [], library = [], selectedCategory = '';
const number = (n) => new Intl.NumberFormat('zh-CN').format(n);
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
function externalLink(url, className, text) {
  const a = el('a', className, text);
  try { const parsed = new URL(url); a.href = parsed.protocol === 'https:' ? parsed.href : 'https://github.com'; }
  catch { a.href = 'https://github.com'; }
  a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
function validProject(p) {
  return p && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(p.name)
    && typeof p.summary_zh === 'string' && Number.isFinite(p.stars) && p.guide && Array.isArray(p.guide.steps);
}
function card(p, i) {
  const node = el('article', 'card');
  const top = el('div', 'card-top');
  top.append(el('span', 'rank', String(i + 1).padStart(2, '0')), el('span', 'category', p.category));
  if (p.is_new) top.append(el('span', 'new', '今日新增'));
  const task = el('h3', 'task-title', p.guide.task);
  const title = el('p', 'project-name');
  const [owner, name] = p.name.split('/');
  const url = `https://github.com/${p.name}`;
  title.append(el('span', 'owner', owner), externalLink(url, '', name));
  node.append(top, task, title, el('p', 'summary', p.summary_zh));
  const facts = el('dl', 'facts');
  for (const [label, value] of [['适合谁', p.guide.audience], ['上手门槛', p.guide.difficulty], ['费用', p.guide.cost], ['API Key', p.guide.api_key]]) {
    facts.append(el('dt', '', label), el('dd', '', value || '尚未核实'));
  }
  node.append(facts);
  const quick = el('details', 'quick-start');
  quick.append(el('summary', '', '怎么开始 · 查看操作步骤'));
  const steps = el('ol');
  for (const step of p.guide.steps) steps.append(el('li', '', step));
  quick.append(steps, el('p', 'outcome', `完成后：${p.guide.result}`), el('p', '', `适用平台：${p.guide.platform}`), el('p', '', `硬件 / 环境：${p.guide.hardware}`), el('p', '', `体验方式：${p.guide.demo || '尚未核实'}`));
  node.append(quick, el('p', 'limitations', `先看限制：${p.guide.limitations}`));
  const evidence = el('details', 'evidence');
  evidence.append(el('summary', '', `${p.summary_source} · ${p.guide.reviewed_at || '日期未记录'}`));
  for (const [i, source] of (p.guide.sources || []).entries()) evidence.append(externalLink(source, 'evidence-link', `官方资料 ${i + 1} ↗`));
  evidence.append(el('p', '', '上手步骤按文档整理，尚未在各平台安装测试；费用和配置可能随版本变化。'));
  node.append(evidence);
  if (p.description && p.description !== p.summary_zh) {
    const original = el('details', 'original');
    original.append(el('summary', '', '查看原始简介'), el('p', '', p.description));
    node.append(original);
  }
  const why = el('details', 'trend-note');
  why.append(el('summary', '', '查看热度信号（辅助参考）'), el('p', '', p.why_zh || '暂无短期增长信号'));
  const tags = el('div', 'tags');
  for (const tag of (p.topics || []).slice(0, 5)) tags.append(el('span', 'tag', tag));
  const bottom = el('div', 'card-bottom'), metrics = el('div', 'metrics');
  metrics.append(el('span', '', p.language || '未标注'), el('span', 'star', `☆ ${number(p.stars)}`));
  let growth = '短期增长数据暂缺';
  if (Number.isFinite(p.stars_today)) growth = `今日 +${number(p.stars_today)} Star`;
  else if (Number.isFinite(p.snapshot_delta) && Number.isFinite(p.snapshot_hours))
    growth = `近 ${p.snapshot_hours} 小时 ${p.snapshot_delta >= 0 ? '+' : ''}${number(p.snapshot_delta)} Star`;
  metrics.append(el('span', 'growth', growth));
  const link = externalLink(url, 'repo-link', '查看仓库 ↗');
  link.setAttribute('aria-label', `在 GitHub 打开 ${p.name}`);
  const actions = el('div', 'card-actions');
  actions.append(externalLink(p.guide.entry_url, 'primary-link', `${p.guide.entry_label || '官方上手入口'} ↗`), link);
  bottom.append(metrics); node.append(why, tags, actions, bottom);
  return node;
}
function render() {
  const query = $('search').value.toLocaleLowerCase().trim(), language = $('language').value;
  const filtered = projects.filter(p => (!selectedCategory || p.category === selectedCategory)
    && (!language || p.language === language)
    && (!$('easyOnly').checked || p.guide.difficulty === '安装即用')
    && [p.name, p.summary_zh, p.description, p.guide.task, p.guide.audience, ...(p.topics || [])].join(' ').toLocaleLowerCase().includes(query));
  const mode = $('sort').value;
  const value = p => mode === 'growth' ? (Number.isFinite(p.stars_today) ? p.stars_today : -1)
    : mode === 'stars' ? p.stars : mode === 'new' ? Number(p.is_new) : (p.practical_score || 0);
  filtered.sort((a,b) => value(b) - value(a) || (b.score || 0) - (a.score || 0));
  $('cards').replaceChildren(...filtered.map(card));
  $('cards').setAttribute('aria-busy', 'false');
  $('resultCount').textContent = `${filtered.length} / ${projects.length} 个项目`;
  $('empty').hidden = filtered.length !== 0;
}
async function load() {
  $('error').hidden = true;
  $('cards').setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('./data/trending.json', {cache: 'no-cache'});
    if (!response.ok) throw new Error('data unavailable');
    const data = await response.json();
    if (!Array.isArray(data.projects) || !data.projects.length) throw new Error('empty data');
    dailyProjects = data.projects.filter(validProject);
    library = (data.library || data.projects).filter(validProject);
    projects = $('scope').value === 'library' ? library : dailyProjects;
    if (!projects.length) throw new Error('invalid data');
    const at = new Date(data.updated_at);
    if (!Number.isFinite(at.getTime())) throw new Error('invalid timestamp');
    $('updated').textContent = `最后更新 ${new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(at)}`;
    $('updated').dateTime = at.toISOString();
    $('total').textContent = dailyProjects.length;
    $('newCount').textContent = library.filter(p => p.guide.difficulty === '安装即用').length;
    $('candidateCount').textContent = library.length;
    $('discoveryNote').textContent = data.discovery_mode === 'curated-library'
      ? '当前使用已整理的工具库，每天更新活跃度并重新精选；新工具的详细指南需补充文档整理或配置 DeepSeek。'
      : '从工具库与新发现中每日精选；AI 整理的指南会单独标注。';
    const language = $('language').value;
    $('language').replaceChildren(new Option('全部语言', ''), ...[...new Set(library.map(p => p.language))].filter(Boolean).sort().map(l => new Option(l,l)));
    if ([...$('language').options].some(o => o.value === language)) $('language').value = language;
    const notices = [...(data.warnings || [])];
    if (Date.now() - at.getTime() > 36 * 3600000) notices.unshift('当前显示上次成功更新的数据，最新一期尚未生成。');
    $('notice').textContent = notices.join(' '); $('notice').hidden = notices.length === 0;
    render();
  } catch {
    $('cards').replaceChildren(); $('cards').setAttribute('aria-busy', 'false');
    $('empty').hidden = true; $('error').hidden = false;
    $('resultCount').textContent = '加载失败'; $('updated').textContent = '更新时间暂不可用';
  }
}
$('search').addEventListener('input', render);
for (const id of ['language', 'sort']) $(id).addEventListener('change', render);
$('easyOnly').addEventListener('change', render);
$('scope').addEventListener('change', () => { projects = $('scope').value === 'library' ? library : dailyProjects; render(); });
document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
  selectedCategory = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(b => {
    const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active));
  }); render();
}));
$('reset').addEventListener('click', () => {
  $('search').value = ''; $('language').value = ''; $('sort').value = 'heat';
  $('easyOnly').checked = false;
  document.querySelector('[data-category=""]').click();
});
$('retry').addEventListener('click', load);
load();
