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
    && typeof p.summary_zh === 'string' && Number.isFinite(p.stars);
}
function card(p, i) {
  const node = el('article', 'card');
  const top = el('div', 'card-top');
  top.append(el('span', 'rank', String(i + 1).padStart(2, '0')), el('span', 'category', p.category));
  top.append(el('span', 'new', p.status_label || '观察中'));
  const url = `https://github.com/${p.name}`;
  const title = el('h3', 'task-title');
  title.append(externalLink(url, '', p.name));
  node.append(top, title, el('p', 'category', p.lane || ''), el('p', 'summary', p.summary_zh));
  node.append(el('p', 'summary-source', p.summary_source));
  const changes = [];
  if (Number.isFinite(p.rank_change)) changes.push(`候选池排名 ${p.rank_change > 0 ? '↑' : p.rank_change < 0 ? '↓' : '持平'}${Math.abs(p.rank_change) || ''}`);
  if (Number.isFinite(p.heat_change)) changes.push(`近期日热度变化 ${p.heat_change >= 0 ? '+' : ''}${number(p.heat_change)}`);
  if (Number.isFinite(p.window_star_delta)) changes.push(`近 ${p.window_days} 天 Star ${p.window_star_delta >= 0 ? '+' : ''}${number(p.window_star_delta)}`);
  node.append(el('p', 'growth', changes.join(' · ') || '历史样本积累中，暂不判断加速'));
  if (p.description && p.description !== p.summary_zh) {
    const original = el('details', 'original');
    original.append(el('summary', '', '查看原始简介'), el('p', '', p.description));
    node.append(original);
  }
  const why = el('div', 'trend-note');
  why.append(el('strong', '', '为什么值得关注'), el('p', '', p.why_zh || '暂无短期增长信号'));
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
  actions.append(link);
  bottom.append(metrics); node.append(why, tags, actions, bottom);
  return node;
}
function render() {
  const query = $('search').value.toLocaleLowerCase().trim(), language = $('language').value;
  const filtered = projects.filter(p => (!selectedCategory || p.category === selectedCategory)
    && (!language || p.language === language)
    && (!$('easyOnly').checked || p.is_ai)
    && [p.name, p.summary_zh, p.description, p.category, p.status_label, ...(p.topics || [])].join(' ').toLocaleLowerCase().includes(query));
  const mode = $('sort').value;
  const value = p => mode === 'growth' ? (Number.isFinite(p.stars_today) ? p.stars_today : (p.heat ?? -1))
    : mode === 'stars' ? p.stars : mode === 'new' ? Number(p.is_new) : (p.score || 0);
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
    const dataUrl = new URL('./data/trending.json', window.location.href);
    dataUrl.searchParams.set('v', String(Date.now()));
    const response = await fetch(dataUrl, {cache: 'no-store'});
    if (!response.ok) throw new Error('data unavailable');
    const data = await response.json();
    if (!Array.isArray(data.projects)) throw new Error('invalid data');
    dailyProjects = data.projects.filter(validProject);
    library = (data.library || data.projects).filter(validProject);
    projects = $('scope').value === 'library' ? library : dailyProjects;

    const at = new Date(data.updated_at);
    if (!Number.isFinite(at.getTime())) throw new Error('invalid timestamp');
    $('updated').textContent = `最后更新 ${new Intl.DateTimeFormat('zh-CN', {timeZone:'Asia/Shanghai',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(at)}`;
    $('updated').dateTime = at.toISOString();
    $('total').textContent = dailyProjects.length;
    $('newCount').textContent = dailyProjects.filter(p => p.is_ai).length;
    $('candidateCount').textContent = data.candidate_count;
    $('discoveryNote').textContent = '目标 15 个 AI 项目 + 5 个全站爆发项目。新出现表示首次被扫描发现，不代表今天创建；无明显变化的近期重复项目不入选。';
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
