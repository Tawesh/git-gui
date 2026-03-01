const state = {
  repoPath: '',
  branch: '未选择',
  unstaged: [],
  staged: [],
  active: { kind: '', file: '', cached: false },
  selected: { unstaged: new Set(), staged: new Set() },
  ext: { files: [], destDir: '', allowOverwrite: false },
  branches: { local: [], remote: [], current: '' },
  commits: [],
  settings: {
    autoRefreshOnOpen: true,
    confirmDangerous: true,
    autoLoadDiff: true,
    userGlobalScope: true,
  },
  editorVisible: false,
  editorOriginal: '',
  editorDirty: false,
  guideIndex: 0,
}

function $(id) {
  return document.getElementById(id)
}

const els = {
  btnOpenRepo: $('btnOpenRepo'),
  btnRefresh: $('btnRefresh'),
  btnInitRepo: $('btnInitRepo'),
  btnRemote: $('btnRemote'),
  btnClone: $('btnClone'),
  btnBranchMgr: $('btnBranchMgr'),
  btnMergePull: $('btnMergePull'),
  btnShowLog: $('btnShowLog'),
  btnRevert: $('btnRevert'),
  repoLabel: $('repoLabel'),
  branchLabel: $('branchLabel'),
  unstagedSearch: $('unstagedSearch'),
  stagedSearch: $('stagedSearch'),
  unstagedList: $('unstagedList'),
  stagedList: $('stagedList'),
  btnAddSelected: $('btnAddSelected'),
  btnAddExternal: $('btnAddExternal'),
  btnAddAll: $('btnAddAll'),
  btnResetSelected: $('btnResetSelected'),
  btnResetAll: $('btnResetAll'),
  commitMsg: $('commitMsg'),
  btnCommit: $('btnCommit'),
  btnPush: $('btnPush'),
  diffView: $('diffView'),
  editorWrap: $('editorWrap'),
  editorGutter: $('editorGutter'),
  editorView: $('editorView'),
  btnEditFile: $('btnEditFile'),
  btnSaveFile: $('btnSaveFile'),
  statusLabel: $('statusLabel'),
  fileCount: $('fileCount'),
  userName: $('userName'),
  userEmail: $('userEmail'),
  btnUserSave: $('btnUserSave'),
  userGlobalScope: $('userGlobalScope'),
  dlgClone: $('dlgClone'),
  cloneUrl: $('cloneUrl'),
  cloneParent: $('cloneParent'),
  btnChooseCloneParent: $('btnChooseCloneParent'),
  btnCloneDo: $('btnCloneDo'),
  dlgRemote: $('dlgRemote'),
  remoteUrl: $('remoteUrl'),
  btnRemoteSave: $('btnRemoteSave'),
  btnRemoteRemove: $('btnRemoteRemove'),
  dlgMergePull: $('dlgMergePull'),
  mpOp: $('mpOp'),
  mpSource: $('mpSource'),
  mpTarget: $('mpTarget'),
  btnMergePullDo: $('btnMergePullDo'),
  dlgLog: $('dlgLog'),
  logView: $('logView'),
  dlgRevert: $('dlgRevert'),
  commitList: $('commitList'),
  btnRevertDo: $('btnRevertDo'),
  dlgBranches: $('dlgBranches'),
  localBranchList: $('localBranchList'),
  remoteBranchList: $('remoteBranchList'),
  newBranchName: $('newBranchName'),
  newBranchBase: $('newBranchBase'),
  btnCheckoutLocal: $('btnCheckoutLocal'),
  btnCheckoutRemote: $('btnCheckoutRemote'),
  btnRefreshBranches1: $('btnRefreshBranches1'),
  btnRefreshBranches2: $('btnRefreshBranches2'),
  btnCreateBranch: $('btnCreateBranch'),
  dlgAddExternal: $('dlgAddExternal'),
  extFiles: $('extFiles'),
  extDestDir: $('extDestDir'),
  extOverwrite: $('extOverwrite'),
  btnChooseExtFiles: $('btnChooseExtFiles'),
  btnChooseExtDest: $('btnChooseExtDest'),
  btnDoAddExternal: $('btnDoAddExternal'),
  dlgMessage: $('dlgMessage'),
  msgIcon: $('msgIcon'),
  msgTitle: $('msgTitle'),
  msgText: $('msgText'),
  msgDetails: $('msgDetails'),
  btnMsgOk: $('btnMsgOk'),
  btnMsgCancel: $('btnMsgCancel'),
  btnMsgClose: $('btnMsgClose'),
  btnSettings: $('btnSettings'),
  dlgSettings: $('dlgSettings'),
  prefAutoRefreshOnOpen: $('prefAutoRefreshOnOpen'),
  prefConfirmDangerous: $('prefConfirmDangerous'),
  prefAutoLoadDiff: $('prefAutoLoadDiff'),
  aboutName: $('aboutName'),
  aboutVersion: $('aboutVersion'),
  aboutPlatform: $('aboutPlatform'),
  contactEmail: $('contactEmail'),
  contactWebsite: $('contactWebsite'),
  btnCopyEmail: $('btnCopyEmail'),
  btnCopyWebsite: $('btnCopyWebsite'),
  btnResetPrefs: $('btnResetPrefs'),
  gitDetectStatus: $('gitDetectStatus'),
  gitVersion: $('gitVersion'),
  gitPathInput: $('gitPathInput'),
  btnGitDetect: $('btnGitDetect'),
  btnPickGitPath: $('btnPickGitPath'),
  btnSaveGitPath: $('btnSaveGitPath'),
  btnDownloadGit: $('btnDownloadGit'),
  dlgGuide: $('dlgGuide'),
  guideTitle: $('guideTitle'),
  guideDesc: $('guideDesc'),
  guideSteps: $('guideSteps'),
  btnGuideSkip: $('btnGuideSkip'),
  btnGuidePrev: $('btnGuidePrev'),
  btnGuideNext: $('btnGuideNext'),
  btnGuideFinish: $('btnGuideFinish'),
  btnOpenGuide: $('btnOpenGuide'),
}

function nowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function setStatus(message) {
  els.statusLabel.textContent = `[${nowText()}] ${message}`
}

const SETTINGS_KEY = 'git-tool:settings:v1'
const GUIDE_KEY = 'git-tool:guide:v1'

function defaultSettings() {
  return { autoRefreshOnOpen: true, confirmDangerous: true, autoLoadDiff: true, gitPath: '', userGlobalScope: true }
}

function normalizeSettings(input) {
  const d = defaultSettings()
  const s = input && typeof input === 'object' ? input : {}
  return {
    autoRefreshOnOpen: typeof s.autoRefreshOnOpen === 'boolean' ? s.autoRefreshOnOpen : d.autoRefreshOnOpen,
    confirmDangerous: typeof s.confirmDangerous === 'boolean' ? s.confirmDangerous : d.confirmDangerous,
    autoLoadDiff: typeof s.autoLoadDiff === 'boolean' ? s.autoLoadDiff : d.autoLoadDiff,
    gitPath: typeof s.gitPath === 'string' ? s.gitPath : d.gitPath,
    userGlobalScope: typeof s.userGlobalScope === 'boolean' ? s.userGlobalScope : d.userGlobalScope,
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings()
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return defaultSettings()
  }
}

function saveSettings(next) {
  state.settings = normalizeSettings(next)
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))
  } catch {}
}

const GUIDE_STEPS = [
  {
    title: '克隆仓库',
    desc: '从远程地址获取完整项目并自动加载到工具中。',
    steps: ['点击顶部“克隆仓库”', '输入远程仓库 URL', '选择本地保存目录并开始克隆', '克隆完成后自动加载仓库'],
  },
  {
    title: '修改文件',
    desc: '在未暂存列表中选择文件并打开编辑器进行修改。',
    steps: ['在左侧“未暂存文件”选择目标文件', '点击“编辑”进入实时编辑', '修改内容后点击“保存”'],
  },
  {
    title: '提交修改',
    desc: '将修改添加到暂存区并创建提交记录。',
    steps: ['勾选需要提交的文件并点击“暂存”', '填写提交信息', '点击“提交”完成一次提交'],
  },
  {
    title: '推送远程',
    desc: '把本地提交同步到远程仓库。',
    steps: ['确认已设置远程地址', '点击“推送”', '如提示设置上游分支，请按提示完成'],
  },
]

function markGuideDone() {
  try {
    localStorage.setItem(GUIDE_KEY, 'done')
  } catch {}
}

function shouldShowGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) !== 'done'
  } catch {
    return true
  }
}

function renderGuideStep(index) {
  const step = GUIDE_STEPS[index]
  els.guideTitle.textContent = `新手引导 · 第 ${index + 1} 步 / ${GUIDE_STEPS.length} 步`
  els.guideDesc.textContent = `${step.title}：${step.desc}`
  els.guideSteps.innerHTML = ''
  for (const s of step.steps) {
    const li = document.createElement('li')
    li.textContent = s
    els.guideSteps.appendChild(li)
  }
  els.btnGuidePrev.disabled = index === 0
  const isLast = index === GUIDE_STEPS.length - 1
  els.btnGuideNext.style.display = isLast ? 'none' : 'inline-flex'
  els.btnGuideFinish.style.display = isLast ? 'inline-flex' : 'none'
}

function openGuide() {
  state.guideIndex = 0
  renderGuideStep(state.guideIndex)
  els.dlgGuide.showModal()
}

function nextGuideStep() {
  if (state.guideIndex >= GUIDE_STEPS.length - 1) return
  state.guideIndex += 1
  renderGuideStep(state.guideIndex)
}

function prevGuideStep() {
  if (state.guideIndex <= 0) return
  state.guideIndex -= 1
  renderGuideStep(state.guideIndex)
}

function finishGuide() {
  markGuideDone()
  els.dlgGuide.close('ok')
}

function skipGuide() {
  markGuideDone()
  els.dlgGuide.close('cancel')
}

async function confirmIfEnabled(title, message) {
  if (!state.settings.confirmDangerous) return true
  return showConfirm(title, message)
}

function applySettingsToUI() {
  els.prefAutoRefreshOnOpen.checked = Boolean(state.settings.autoRefreshOnOpen)
  els.prefConfirmDangerous.checked = Boolean(state.settings.confirmDangerous)
  els.prefAutoLoadDiff.checked = Boolean(state.settings.autoLoadDiff)
  els.gitPathInput.value = state.settings.gitPath || ''
  els.userGlobalScope.checked = Boolean(state.settings.userGlobalScope)
}

async function copyText(text) {
  const t = String(text || '')
  if (!t) return
  try {
    await navigator.clipboard.writeText(t)
    await showMessageDialog({ variant: 'success', title: '已复制', message: t, showCancel: false, okText: '确定' })
  } catch {
    await showAlert('提示', '复制失败，请手动复制。')
  }
}

function setMsgVariant(variant) {
  const v = variant || 'info'
  els.dlgMessage.classList.remove('info', 'warn', 'error', 'success')
  els.dlgMessage.classList.add(v)
  const base = './fontawesome-free-7.1.0-desktop/svgs-full/solid'
  let icon = 'circle-info.svg'
  if (v === 'error') icon = 'circle-xmark.svg'
  else if (v === 'warn') icon = 'circle-exclamation.svg'
  else if (v === 'success') icon = 'circle-check.svg'
  els.msgIcon.style.setProperty('--ico', `url('${base}/${icon}')`)
}

function showMessageDialog({ variant, title, message, details, okText, cancelText, showCancel }) {
  setMsgVariant(variant)
  els.msgTitle.textContent = title || '提示'
  els.msgText.textContent = message || ''
  const d = String(details || '').trim()
  if (d) {
    els.msgDetails.style.display = 'block'
    els.msgDetails.textContent = d
  } else {
    els.msgDetails.style.display = 'none'
    els.msgDetails.textContent = ''
  }

  els.btnMsgOk.textContent = okText || '确定'
  els.btnMsgCancel.textContent = cancelText || '取消'
  els.btnMsgCancel.style.display = showCancel ? 'inline-flex' : 'none'

  return new Promise((resolve) => {
    const dlg = els.dlgMessage
    const onClose = () => {
      dlg.removeEventListener('close', onClose)
      resolve(dlg.returnValue || 'cancel')
    }
    dlg.addEventListener('close', onClose)
    dlg.showModal()
  })
}

async function showAlert(title, message, details) {
  await showMessageDialog({ variant: 'info', title, message, details, showCancel: false, okText: '确定' })
}

async function showConfirm(title, message, details) {
  const rv = await showMessageDialog({ variant: 'warn', title, message, details, showCancel: true, okText: '确定', cancelText: '取消' })
  return rv === 'ok'
}

async function showError(title, message, details) {
  await showMessageDialog({ variant: 'error', title, message, details, showCancel: false, okText: '确定' })
}

function setRepoLabel() {
  if (!state.repoPath) els.repoLabel.textContent = '未选择仓库'
  else {
    const parts = state.repoPath.split(/[\\/]/).filter(Boolean)
    const name = parts[parts.length - 1] || state.repoPath
    els.repoLabel.textContent = `📁 ${name}`
  }
}

function updateEnabled() {
  const enabled = Boolean(state.repoPath)
  const repoState = enabled ? false : true

  for (const btn of [
    els.btnRefresh,
    els.btnRemote,
    els.btnBranchMgr,
    els.btnMergePull,
    els.btnShowLog,
    els.btnRevert,
    els.btnAddSelected,
    els.btnAddExternal,
    els.btnAddAll,
    els.btnResetSelected,
    els.btnResetAll,
    els.btnCommit,
    els.btnPush,
    els.btnEditFile,
    els.btnSaveFile,
  ]) {
    btn.disabled = !enabled
  }

  els.btnInitRepo.disabled = !repoState

  const hasFile = enabled && Boolean(state.active.file)
  els.btnEditFile.disabled = !hasFile
  const canSave = hasFile && state.editorVisible && state.editorDirty
  els.btnSaveFile.disabled = !canSave
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderDiff(text) {
  const lines = String(text || '').split(/\r?\n/)
  if (lines.length === 1 && lines[0] === '') {
    els.diffView.innerHTML = escapeHtml('没有差异或文件为新文件')
    return
  }
  const html = lines
    .map((line) => {
      const esc = escapeHtml(line)
      if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) return `<span class="header">${esc}</span>`
      if (line.startsWith('+')) return `<span class="added">${esc}</span>`
      if (line.startsWith('-')) return `<span class="removed">${esc}</span>`
      return esc
    })
    .join('\n')
  els.diffView.innerHTML = html
  els.diffView.scrollTop = 0
}

function renderCounts() {
  els.fileCount.textContent = `未暂存: ${state.unstaged.length} | 已暂存: ${state.staged.length}`
}

function setActiveFile(kind, file, cached) {
  state.active = { kind, file, cached }
}

function renderFileList(kind, listEl, files, searchText) {
  const filter = String(searchText || '').trim().toLowerCase()
  const selected = state.selected[kind]
  listEl.innerHTML = ''

  for (const item of files) {
    if (filter && !String(item.file || '').toLowerCase().includes(filter)) continue
    const li = document.createElement('li')
    li.className = 'file-item'
    li.dataset.file = item.file
    li.dataset.kind = kind

    if (state.active.kind === kind && state.active.file === item.file) li.classList.add('active')

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = selected.has(item.file)
    cb.addEventListener('change', () => {
      if (cb.checked) selected.add(item.file)
      else selected.delete(item.file)
    })

    const text = document.createElement('div')
    text.textContent = item.display
    text.style.flex = '1'

    li.addEventListener('click', async (evt) => {
      if (evt.target === cb) return
      setActiveFile(kind, item.file, kind === 'staged')
      state.editorVisible = false
      els.editorWrap.style.display = 'none'
      els.diffView.style.display = 'block'
      state.editorOriginal = ''
      state.editorDirty = false
      renderAll()
      if (state.settings.autoLoadDiff) await loadDiff()
    })

    li.appendChild(cb)
    li.appendChild(text)
    listEl.appendChild(li)
  }
}

function renderBranchLabel() {
  els.branchLabel.textContent = state.branch || 'detached'
}

function renderAll() {
  setRepoLabel()
  renderBranchLabel()
  renderCounts()
  updateEnabled()
  renderFileList('unstaged', els.unstagedList, state.unstaged, els.unstagedSearch.value)
  renderFileList('staged', els.stagedList, state.staged, els.stagedSearch.value)
}

async function withRepo(actionName, fn) {
  if (!state.repoPath) {
    await showAlert('提示', `请先打开一个 Git 仓库，再执行 ${actionName}`)
    return
  }
  await fn()
}

async function ensureOk(res, fallbackMessage) {
  if (!res || res.ok) return res?.data
  const msg = res?.error?.message || fallbackMessage || '操作失败'
  const details = res?.error?.details ? String(res.error.details) : ''
  await showError(fallbackMessage || '操作失败', msg, details)
  return null
}

async function refresh() {
  if (!state.repoPath) return
  setStatus('正在刷新...')
  const data = await ensureOk(await window.gitTool.refresh(state.repoPath), '刷新失败')
  if (!data) return
  state.branch = data.branch
  state.unstaged = data.unstaged || []
  state.staged = data.staged || []
  renderAll()
  setStatus('刷新完成')
}

async function loadDiff() {
  if (!state.repoPath || !state.active.file) return
  setStatus(`正在加载差异: ${state.active.file}`)
  const data = await ensureOk(await window.gitTool.diff(state.repoPath, state.active.file, state.active.cached), '加载差异失败')
  if (!data) return
  renderDiff(data.diff)
  setStatus(`已加载差异: ${state.active.file}`)
}

async function openEditor() {
  if (!state.repoPath || !state.active.file) {
    await showAlert('提示', '请先选择一个文件')
    return
  }
  setStatus(`正在加载文件: ${state.active.file}`)
  const data = await ensureOk(await window.gitTool.readFile(state.repoPath, state.active.file), '读取文件失败')
  if (!data) return
  els.editorView.value = data.content || ''
  state.editorVisible = true
  state.editorOriginal = data.content || ''
  state.editorDirty = false
  els.editorWrap.style.display = 'grid'
  els.diffView.style.display = 'none'
  setStatus(`已加载文件: ${state.active.file}`)
  updateEditorGutter()
  updateEnabled()
}

async function saveActiveFile() {
  if (!state.repoPath || !state.active.file) return
  const content = String(els.editorView.value || '')
  setStatus(`正在保存文件: ${state.active.file}`)
  const data = await ensureOk(await window.gitTool.writeFile(state.repoPath, state.active.file, content), '写入文件失败')
  if (!data) return
  await showMessageDialog({ variant: 'success', title: '保存成功', message: `已保存: ${state.active.file}`, showCancel: false, okText: '确定' })
  setStatus(`已保存文件: ${state.active.file}`)
  state.editorOriginal = content
  state.editorDirty = false
  updateEnabled()
  await refresh()
  await loadDiff()
}

function debounce(fn, ms) {
  let t = 0
  return (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
}

function onEditorInput() {
  const cur = String(els.editorView.value || '')
  state.editorDirty = cur !== String(state.editorOriginal || '')
  debouncedGutterUpdate()
  updateEnabled()
}

function onKeyDown(evt) {
  const k = evt.key
  const ctrl = evt.ctrlKey || evt.metaKey
  if (ctrl && (k === 's' || k === 'S')) {
    if (!els.btnSaveFile.disabled) {
      evt.preventDefault()
      saveActiveFile()
    }
  }
}

function updateEditorGutter() {
  const v = String(els.editorView.value || '')
  const n = v ? v.split(/\r?\n/).length : 1
  let html = ''
  for (let i = 1; i <= n; i++) html += `<div class="ln">${i}</div>`
  els.editorGutter.innerHTML = html
  onEditorScroll()
}

const debouncedGutterUpdate = debounce(updateEditorGutter, 50)

function onEditorScroll() {
  els.editorGutter.scrollTop = els.editorView.scrollTop
}

function selectedFiles(kind) {
  return Array.from(state.selected[kind].values())
}

function clearSelections() {
  state.selected.unstaged.clear()
  state.selected.staged.clear()
}

async function openRepo() {
  const data = await ensureOk(await window.gitTool.selectRepo(), '打开仓库失败')
  if (!data || data.canceled) return
  if (data.isRepo) {
    state.repoPath = data.repoPath
    clearSelections()
    setActiveFile('', '', false)
    renderAll()
    setStatus('仓库已加载')
    if (state.settings.autoRefreshOnOpen) await refresh()
    return
  }
  const tip = `所选目录不是有效的 Git 仓库。\n\n要在以下目录初始化仓库吗?\n${data.repoPath}`
  const details =
    '初始化会在该目录创建一个新的 .git 仓库以开始版本管理，不会修改现有文件内容。' +
    '\n\n如果你误选了目录，建议取消并重新选择正确的项目根目录。'
  const rv = await showMessageDialog({
    variant: 'warn',
    title: '初始化 Git 仓库',
    message: tip,
    details,
    showCancel: true,
    okText: '继续初始化',
    cancelText: '取消',
  })
  if (rv !== 'ok') {
    await showAlert('提示', '已取消初始化')
    return
  }
  const tip2 = `请再次确认要在以下目录执行初始化:\n${data.repoPath}`
  if (!(await confirmIfEnabled('再次确认', tip2))) {
    await showAlert('提示', '已取消初始化')
    return
  }
  const initRes = await ensureOk(await window.gitTool.initRepo(data.repoPath), '初始化失败')
  if (!initRes) return
  await showMessageDialog({ variant: 'success', title: '成功', message: `Git 仓库已初始化:\n${initRes.repoPath}`, showCancel: false, okText: '确定' })
  state.repoPath = initRes.repoPath
  clearSelections()
  setActiveFile('', '', false)
  renderAll()
  setStatus('仓库已加载')
  if (state.settings.autoRefreshOnOpen) await refresh()
}

async function addSelected() {
  await withRepo('添加文件', async () => {
    const files = selectedFiles('unstaged')
    if (files.length === 0) {
      await showAlert('提示', '请先选择要添加的文件')
      return
    }
    const data = await ensureOk(await window.gitTool.add(state.repoPath, files), '添加文件失败')
    if (!data) return
    setStatus(`已添加 ${files.length} 个文件到暂存区`)
    clearSelections()
    await refresh()
  })
}

async function addAll() {
  await withRepo('添加所有文件', async () => {
    if (state.unstaged.length === 0) {
      await showAlert('提示', '没有未暂存的文件')
      return
    }
    if (!(await confirmIfEnabled('确认', '确定要添加所有未暂存的文件吗?'))) return
    const data = await ensureOk(await window.gitTool.addAll(state.repoPath), '添加全部失败')
    if (!data) return
    setStatus('已添加所有文件到暂存区')
    clearSelections()
    await refresh()
  })
}

async function resetSelected() {
  await withRepo('重置暂存区', async () => {
    const files = selectedFiles('staged')
    if (files.length === 0) {
      await showAlert('提示', '请先选择要移除的文件')
      return
    }
    const data = await ensureOk(await window.gitTool.reset(state.repoPath, files), '重置失败')
    if (!data) return
    setStatus(`已从暂存区移除 ${files.length} 个文件`)
    clearSelections()
    await refresh()
  })
}

async function resetAll() {
  await withRepo('重置全部暂存区', async () => {
    if (state.staged.length === 0) {
      await showAlert('提示', '没有已暂存的文件')
      return
    }
    if (!(await confirmIfEnabled('确认', '确定要移除所有已暂存的文件吗?'))) return
    const data = await ensureOk(await window.gitTool.resetAll(state.repoPath), '重置全部失败')
    if (!data) return
    setStatus('已从暂存区移除所有文件')
    clearSelections()
    await refresh()
  })
}

async function doCommit() {
  await withRepo('提交', async () => {
    const msg = String(els.commitMsg.value || '').trim()
    if (!msg) {
      await showAlert('提示', '请输入提交信息')
      return
    }
    if (state.staged.length === 0) {
      await showAlert('提示', '没有已暂存的文件可以提交')
      return
    }
    const data = await ensureOk(await window.gitTool.commit(state.repoPath, msg), '提交失败')
    if (!data) return
    await showMessageDialog({ variant: 'success', title: '提交成功', message: '提交完成!', details: data.output || '', showCancel: false, okText: '确定' })
    els.commitMsg.value = ''
    setStatus('提交成功')
    await refresh()
  })
}

async function doPush() {
  await withRepo('推送', async () => {
    if (!(await showConfirm('推送', '是否要推送到远程仓库?'))) return
    const data = await ensureOk(await window.gitTool.push(state.repoPath), '推送失败')
    if (!data) return
    await showMessageDialog({ variant: 'success', title: '推送完成', message: '推送完成!', details: data.output || '', showCancel: false, okText: '确定' })
    setStatus('推送完成')
    await refresh()
  })
}

function resolveUserScope() {
  return state.settings.userGlobalScope ? 'global' : 'repo'
}

async function loadUserInfo() {
  const scope = resolveUserScope()
  if (scope === 'repo' && !state.repoPath) {
    els.userName.value = ''
    els.userEmail.value = ''
    return
  }
  const data = await ensureOk(await window.gitTool.getUser(state.repoPath || '', scope), '读取用户信息失败')
  if (!data) return
  els.userName.value = data.name || ''
  els.userEmail.value = data.email || ''
}

async function saveUser(evt) {
  evt.preventDefault()
  const name = String(els.userName.value || '').trim()
  const email = String(els.userEmail.value || '').trim()
  const scope = resolveUserScope()
  if (scope === 'repo' && !state.repoPath) {
    await showAlert('提示', '请先打开一个仓库，再保存仓库级用户信息')
    return
  }
  const data = await ensureOk(await window.gitTool.setUser(state.repoPath || '', name, email, scope), '设置用户失败')
  if (!data) return
  setStatus('Git 用户信息已设置')
  await showMessageDialog({ variant: 'success', title: '成功', message: 'Git 用户信息已设置', showCancel: false, okText: '确定' })
}

async function initRepo() {
  const pick = await ensureOk(await window.gitTool.selectDir({ title: '选择要初始化的目录' }), '选择目录失败')
  if (!pick || pick.canceled || !pick.dirPath) return
  if (!(await confirmIfEnabled('确认', `确定要在以下目录初始化 Git 仓库?\n${pick.dirPath}`))) return
  const data = await ensureOk(await window.gitTool.initRepo(pick.dirPath), '初始化失败')
  if (!data) return
  await showMessageDialog({ variant: 'success', title: '成功', message: `Git 仓库已初始化:\n${data.repoPath}`, showCancel: false, okText: '确定' })
  state.repoPath = data.repoPath
  clearSelections()
  renderAll()
  await refresh()
}

function openCloneDialog() {
  els.cloneUrl.value = ''
  els.cloneParent.value = ''
  els.dlgClone.showModal()
}

async function chooseCloneParent(evt) {
  evt.preventDefault()
  const pick = await ensureOk(await window.gitTool.selectDir({ title: '选择克隆目标父目录', initialDir: state.repoPath || '' }), '选择目录失败')
  if (!pick || pick.canceled || !pick.dirPath) return
  els.cloneParent.value = pick.dirPath
}

async function doClone(evt) {
  evt.preventDefault()
  const url = String(els.cloneUrl.value || '').trim()
  const parentDir = String(els.cloneParent.value || '').trim()
  if (!url) {
    await showAlert('提示', '请输入远程仓库 URL')
    return
  }
  if (!parentDir) {
    await showAlert('提示', '请选择目标父目录')
    return
  }
  if (!(await confirmIfEnabled('确认', `确定要克隆仓库到:\n${parentDir} ?`))) return
  setStatus('正在克隆远程仓库...')
  const data = await ensureOk(await window.gitTool.cloneRepo(url, parentDir), '克隆失败')
  if (!data) return
  await showMessageDialog({ variant: 'success', title: '克隆完成', message: `克隆完成: ${data.repoPath}`, details: data.output || '', showCancel: false, okText: '确定' })
  if (await showConfirm('打开仓库', '是否打开刚刚克隆的仓库?')) {
    state.repoPath = data.repoPath
    clearSelections()
    renderAll()
    await refresh()
  } else {
    setStatus('克隆完成')
  }
  els.dlgClone.close('ok')
}

async function openRemoteDialog() {
  await withRepo('远程仓库', async () => {
    const data = await ensureOk(await window.gitTool.getRemote(state.repoPath), '读取远程仓库失败')
    if (!data) return
    els.remoteUrl.value = data.originUrl || ''
    els.dlgRemote.showModal()
  })
}

async function remoteSave(evt) {
  evt.preventDefault()
  await withRepo('远程仓库', async () => {
    const url = String(els.remoteUrl.value || '').trim()
    const data = await ensureOk(await window.gitTool.setRemote(state.repoPath, url), '设置远程仓库失败')
    if (!data) return
    els.dlgRemote.close('ok')
    setStatus('远程仓库已设置')
  })
}

async function remoteRemove(evt) {
  evt.preventDefault()
  await withRepo('远程仓库', async () => {
    if (!(await confirmIfEnabled('确认', '确定要移除远程仓库关联吗？'))) return
    const data = await ensureOk(await window.gitTool.removeRemote(state.repoPath), '移除远程仓库失败')
    if (!data) return
    els.remoteUrl.value = ''
    els.dlgRemote.close('remove')
    setStatus('远程仓库已移除')
  })
}

async function openMergePullDialog() {
  await withRepo('合并/拉取', async () => {
    await loadBranches()
    els.mpOp.value = 'pull'
    rebuildMergePullOptions()
    els.dlgMergePull.showModal()
  })
}

function setSelectOptions(selectEl, values, selectedValue) {
  selectEl.innerHTML = ''
  for (const v of values) {
    const opt = document.createElement('option')
    opt.value = v
    opt.textContent = v
    selectEl.appendChild(opt)
  }
  if (selectedValue && values.includes(selectedValue)) selectEl.value = selectedValue
  else if (values.length > 0) selectEl.value = values[0]
}

function rebuildMergePullOptions() {
  const op = els.mpOp.value
  const local = state.branches.local || []
  const remote = state.branches.remote || []
  const current = state.branches.current || ''

  setSelectOptions(els.mpTarget, local, current || local[0])
  if (op === 'pull') setSelectOptions(els.mpSource, remote, remote[0])
  else setSelectOptions(els.mpSource, local, local[0])
}

async function doMergePull(evt) {
  evt.preventDefault()
  await withRepo('合并/拉取', async () => {
    const op = els.mpOp.value
    const source = els.mpSource.value
    const target = els.mpTarget.value
    setStatus('正在执行合并/拉取...')
    const res = await window.gitTool.mergePull(state.repoPath, op, source, target)
    if (!res || res.ok) {
      const data = res?.data
      await showMessageDialog({
        variant: 'success',
        title: op === 'pull' ? '拉取完成' : '合并完成',
        message: `${op === 'pull' ? '拉取' : '合并'}完成!`,
        details: data?.output || '',
        showCancel: false,
        okText: '确定',
      })
      els.dlgMergePull.close('ok')
      await refresh()
      return
    }
    const msg = res?.error?.message || '合并/拉取失败'
    const details = res?.error?.details ? String(res.error.details) : ''
    const conflict = /conflict|merge conflict|CONFLICT|Automatic merge failed/i.test(`${msg}\n${details}`)
    if (conflict) {
      await showConflictGuide(op, source, target, details)
      return
    }
    await showError('合并/拉取失败', msg, details)
    return
  })
}

async function openLogDialog() {
  await withRepo('查看日志', async () => {
    const data = await ensureOk(await window.gitTool.log(state.repoPath), '读取日志失败')
    if (!data) return
    els.logView.textContent = data.output || ''
    els.dlgLog.showModal()
  })
}

function renderCommits() {
  els.commitList.innerHTML = ''
  for (const c of state.commits) {
    const li = document.createElement('li')
    li.className = 'commit-item'
    li.dataset.hash = c.hash
    li.textContent = `${c.hash} - ${c.message || ''}`
    li.addEventListener('click', () => {
      for (const el of els.commitList.querySelectorAll('.commit-item')) el.classList.remove('active')
      li.classList.add('active')
    })
    els.commitList.appendChild(li)
  }
  const first = els.commitList.querySelector('.commit-item')
  if (first) first.classList.add('active')
}

function selectedCommitHash() {
  const active = els.commitList.querySelector('.commit-item.active')
  return active ? String(active.dataset.hash || '') : ''
}

async function openRevertDialog() {
  await withRepo('版本回退', async () => {
    const data = await ensureOk(await window.gitTool.listCommits(state.repoPath), '读取提交记录失败')
    if (!data) return
    state.commits = data.commits || []
    renderCommits()
    els.dlgRevert.showModal()
  })
}

async function doRevert(evt) {
  evt.preventDefault()
  await withRepo('版本回退', async () => {
    const hash = selectedCommitHash()
    if (!hash) {
      await showAlert('提示', '请先选择一个提交')
      return
    }
    const mode = document.querySelector('input[name="revertMode"]:checked')?.value || 'soft'
    const short = hash.slice(0, 7)
    const tip = `确定要回退到提交 ${short}?\n\n回退类型: ${mode}\n这将${mode === 'soft' ? '保留' : '清除'}工作目录的更改`
    if (!(await confirmIfEnabled('确认回退', tip))) return
    const data = await ensureOk(await window.gitTool.resetToCommit(state.repoPath, hash, mode), '回退失败')
    if (!data) return
    await showMessageDialog({ variant: 'success', title: '成功', message: `已回退到提交 ${short}`, showCancel: false, okText: '确定' })
    els.dlgRevert.close('ok')
    await refresh()
  })
}

async function loadBranches() {
  const data = await ensureOk(await window.gitTool.listBranches(state.repoPath), '加载分支失败')
  if (!data) return
  state.branches = data
  return data
}

function renderBranchLists() {
  const current = state.branches.current || ''
  els.localBranchList.innerHTML = ''
  for (const b of state.branches.local || []) {
    const li = document.createElement('li')
    li.className = 'branch-item'
    li.dataset.branch = b
    li.textContent = b === current ? `● ${b} (当前)` : `○ ${b}`
    li.addEventListener('click', () => {
      for (const el of els.localBranchList.querySelectorAll('.branch-item')) el.classList.remove('active')
      li.classList.add('active')
    })
    els.localBranchList.appendChild(li)
    if (b === current) li.classList.add('active')
  }

  els.remoteBranchList.innerHTML = ''
  for (const rb of state.branches.remote || []) {
    const li = document.createElement('li')
    li.className = 'branch-item'
    li.dataset.branch = rb
    li.textContent = `🌐 ${rb}`
    li.addEventListener('click', () => {
      for (const el of els.remoteBranchList.querySelectorAll('.branch-item')) el.classList.remove('active')
      li.classList.add('active')
    })
    els.remoteBranchList.appendChild(li)
  }

  const base = [...(state.branches.local || []), ...(state.branches.remote || [])]
  setSelectOptions(els.newBranchBase, base, current || base[0])
}

function selectedBranchFromList(listEl) {
  const active = listEl.querySelector('.branch-item.active')
  return active ? String(active.dataset.branch || '').trim() : ''
}

async function openBranchesDialog() {
  await withRepo('分支管理', async () => {
    await loadBranches()
    renderBranchLists()
    els.dlgBranches.showModal()
  })
}

async function checkoutLocal(evt) {
  evt.preventDefault()
  await withRepo('切换分支', async () => {
    const branch = selectedBranchFromList(els.localBranchList)
    if (!branch) {
      await showAlert('提示', '请先选择一个分支')
      return
    }
    if (!(await confirmIfEnabled('确认', `确定要切换到分支 '${branch}' 吗？`))) return
    const data = await ensureOk(await window.gitTool.checkout(state.repoPath, branch), '切换分支失败')
    if (!data) return
    await showMessageDialog({ variant: 'success', title: '成功', message: `已切换到分支: ${branch}`, showCancel: false, okText: '确定' })
    els.dlgBranches.close('ok')
    await refresh()
  })
}

async function checkoutRemote(evt) {
  evt.preventDefault()
  await withRepo('检出远程分支', async () => {
    const remoteBranch = selectedBranchFromList(els.remoteBranchList)
    if (!remoteBranch) {
      await showAlert('提示', '请先选择一个远程分支')
      return
    }
    const localName = remoteBranch.includes('/') ? remoteBranch.split('/', 2)[1] : remoteBranch
    if (!(await confirmIfEnabled('确认', `确定要检出远程分支 '${remoteBranch}' 到本地分支 '${localName}' 吗？`))) return
    const data = await ensureOk(await window.gitTool.checkoutRemote(state.repoPath, remoteBranch, localName), '检出远程分支失败')
    if (!data) return
    await showMessageDialog({ variant: 'success', title: '成功', message: `已检出远程分支到本地: ${localName}`, showCancel: false, okText: '确定' })
    els.dlgBranches.close('ok')
    await refresh()
  })
}

async function createBranch(evt) {
  evt.preventDefault()
  await withRepo('创建分支', async () => {
    const name = String(els.newBranchName.value || '').trim()
    const base = String(els.newBranchBase.value || '').trim()
    if (!name) {
      await showAlert('提示', '请输入分支名称')
      return
    }
    if (!base) {
      await showAlert('提示', '请选择基础分支')
      return
    }
    if (/\s/.test(name)) {
      await showAlert('提示', '分支名称不能包含空白字符')
      return
    }
    if (!(await confirmIfEnabled('确认', `确定要基于 '${base}' 创建新分支 '${name}' 吗？`))) return
    const data = await ensureOk(await window.gitTool.createBranch(state.repoPath, name, base), '创建分支失败')
    if (!data) return
    await showMessageDialog({ variant: 'success', title: '成功', message: `新分支 '${name}' 已创建并切换`, showCancel: false, okText: '确定' })
    els.newBranchName.value = ''
    await refresh()
    await loadBranches()
    renderBranchLists()
  })
}

async function refreshBranches(evt) {
  evt.preventDefault()
  await withRepo('刷新分支', async () => {
    await loadBranches()
    renderBranchLists()
  })
}

function setupTabs() {
  const tabs = Array.from(els.dlgBranches.querySelectorAll('.tab'))
  const panels = Array.from(els.dlgBranches.querySelectorAll('.tab-panel'))
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab
      for (const t of tabs) t.classList.toggle('active', t === tab)
      for (const p of panels) p.classList.toggle('active', p.dataset.panel === id)
    })
  }
}

function setupSettingsTabs() {
  const tabs = Array.from(els.dlgSettings.querySelectorAll('.settings-tab'))
  const panels = Array.from(els.dlgSettings.querySelectorAll('.settings-panel'))
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab
      for (const t of tabs) t.classList.toggle('active', t === tab)
      for (const p of panels) p.classList.toggle('active', p.dataset.panel === id)
    })
  }
}

async function loadAppInfo() {
  const info = await ensureOk(await window.gitTool.getAppInfo(), '读取应用信息失败')
  if (!info) return
  els.aboutName.textContent = info.name || 'Git GUI Tool'
  els.aboutVersion.textContent = info.version || '-'
  els.aboutPlatform.textContent = `${info.platform || '-'} / ${info.arch || '-'}`
}

function openSettingsDialog() {
  applySettingsToUI()
  loadAppInfo()
  loadUserInfo()
  loadGitInfo()
  els.dlgSettings.showModal()
}

function onSettingsChanged() {
  saveSettings({
    ...state.settings,
    autoRefreshOnOpen: Boolean(els.prefAutoRefreshOnOpen.checked),
    confirmDangerous: Boolean(els.prefConfirmDangerous.checked),
    autoLoadDiff: Boolean(els.prefAutoLoadDiff.checked),
    gitPath: String(els.gitPathInput.value || '').trim(),
  })
}

function onUserScopeChanged() {
  saveSettings({
    ...state.settings,
    userGlobalScope: Boolean(els.userGlobalScope.checked),
  })
  loadUserInfo()
}

async function resetPrefs() {
  if (!(await showConfirm('恢复默认', '确定要恢复默认偏好设置吗？'))) return
  saveSettings(defaultSettings())
  applySettingsToUI()
  setStatus('偏好设置已恢复默认')
}

function attachTemplateButtons() {
  for (const btn of document.querySelectorAll('.template')) {
    btn.addEventListener('click', () => {
      const t = btn.dataset.template || ''
      els.commitMsg.value = `${t}${els.commitMsg.value}`
      els.commitMsg.focus()
    })
  }
}

function openAddExternalDialog() {
  state.ext = { files: [], destDir: state.repoPath, allowOverwrite: false }
  els.extFiles.value = ''
  els.extDestDir.value = state.repoPath || ''
  els.extOverwrite.checked = false
  els.dlgAddExternal.showModal()
}

async function chooseExternalFiles(evt) {
  evt.preventDefault()
  const pick = await ensureOk(await window.gitTool.selectFiles({ title: '选择要添加到仓库的文件' }), '选择文件失败')
  if (!pick || pick.canceled) return
  state.ext.files = pick.filePaths || []
  els.extFiles.value = state.ext.files.length ? `${state.ext.files.length} 个文件` : ''
}

async function chooseExternalDest(evt) {
  evt.preventDefault()
  await withRepo('选择目标目录', async () => {
    const pick = await ensureOk(await window.gitTool.selectDir({ title: '选择复制到仓库的目标目录', initialDir: state.repoPath }), '选择目录失败')
    if (!pick || pick.canceled || !pick.dirPath) return
    state.ext.destDir = pick.dirPath
    els.extDestDir.value = pick.dirPath
  })
}

async function doAddExternal(evt) {
  evt.preventDefault()
  await withRepo('添加外部文件', async () => {
    const files = state.ext.files || []
    if (!files.length) {
      await showAlert('提示', '请先选择要添加的文件')
      return
    }
    const destDir = String(els.extDestDir.value || '').trim() || state.repoPath
    const allowOverwrite = Boolean(els.extOverwrite.checked)
    const data = await ensureOk(await window.gitTool.addExternal(state.repoPath, files, destDir, allowOverwrite), '添加外部文件失败')
    if (!data) return
    const added = data.results?.added || 0
    const copied = data.results?.copied || 0
    const conflicts = data.conflicts || []
    let msg = `已添加 ${added} 个文件到暂存区`
    if (copied) msg += ` (其中 ${copied} 个文件是从外部复制的)`
    if (conflicts.length) msg += `\n\n以下文件因同名冲突被跳过:\n${conflicts.join('\n')}`
    await showMessageDialog({ variant: 'success', title: '完成', message: msg, showCancel: false, okText: '确定' })
    els.dlgAddExternal.close('ok')
    clearSelections()
    await refresh()
  })
}

function bindEvents() {
  els.btnOpenRepo.addEventListener('click', openRepo)
  els.btnRefresh.addEventListener('click', refresh)
  els.btnAddSelected.addEventListener('click', addSelected)
  els.btnAddAll.addEventListener('click', addAll)
  els.btnResetSelected.addEventListener('click', resetSelected)
  els.btnResetAll.addEventListener('click', resetAll)
  els.btnCommit.addEventListener('click', doCommit)
  els.btnPush.addEventListener('click', doPush)
  els.btnEditFile.addEventListener('click', openEditor)
  els.btnSaveFile.addEventListener('click', saveActiveFile)
  const debouncedRender = debounce(renderAll, 150)
  els.unstagedSearch.addEventListener('input', debouncedRender)
  els.stagedSearch.addEventListener('input', debouncedRender)

  els.btnUserSave.addEventListener('click', saveUser)

  els.btnInitRepo.addEventListener('click', initRepo)

  els.btnClone.addEventListener('click', openCloneDialog)
  els.btnChooseCloneParent.addEventListener('click', chooseCloneParent)
  els.btnCloneDo.addEventListener('click', doClone)

  els.btnRemote.addEventListener('click', openRemoteDialog)
  els.btnRemoteSave.addEventListener('click', remoteSave)
  els.btnRemoteRemove.addEventListener('click', remoteRemove)

  els.btnMergePull.addEventListener('click', openMergePullDialog)
  els.mpOp.addEventListener('change', rebuildMergePullOptions)
  els.btnMergePullDo.addEventListener('click', doMergePull)

  els.btnShowLog.addEventListener('click', openLogDialog)

  els.btnRevert.addEventListener('click', openRevertDialog)
  els.btnRevertDo.addEventListener('click', doRevert)

  els.btnBranchMgr.addEventListener('click', openBranchesDialog)
  els.btnCheckoutLocal.addEventListener('click', checkoutLocal)
  els.btnCheckoutRemote.addEventListener('click', checkoutRemote)
  els.btnCreateBranch.addEventListener('click', createBranch)
  els.btnRefreshBranches1.addEventListener('click', refreshBranches)
  els.btnRefreshBranches2.addEventListener('click', refreshBranches)

  els.btnAddExternal.addEventListener('click', openAddExternalDialog)
  els.btnChooseExtFiles.addEventListener('click', chooseExternalFiles)
  els.btnChooseExtDest.addEventListener('click', chooseExternalDest)
  els.btnDoAddExternal.addEventListener('click', doAddExternal)

  els.btnSettings.addEventListener('click', openSettingsDialog)
  els.prefAutoRefreshOnOpen.addEventListener('change', onSettingsChanged)
  els.prefConfirmDangerous.addEventListener('change', onSettingsChanged)
  els.prefAutoLoadDiff.addEventListener('change', onSettingsChanged)
  els.userGlobalScope.addEventListener('change', onUserScopeChanged)
  els.btnResetPrefs.addEventListener('click', resetPrefs)
  els.btnCopyEmail.addEventListener('click', () => copyText(els.contactEmail.textContent))
  els.contactWebsite.addEventListener('click', (e) => {
    e.preventDefault()
    window.gitTool.openExternal('https://tws-site.cn')
  })
  els.editorView.addEventListener('input', onEditorInput)
  els.editorView.addEventListener('scroll', onEditorScroll)
  document.addEventListener('keydown', onKeyDown)
  els.btnGitDetect.addEventListener('click', autoDetectGit)
  els.btnPickGitPath.addEventListener('click', pickGitPath)
  els.btnSaveGitPath.addEventListener('click', saveGitPath)
  els.btnDownloadGit.addEventListener('click', () => window.gitTool.openExternal('https://git-scm.com/'))
  els.btnGuideSkip.addEventListener('click', skipGuide)
  els.btnGuidePrev.addEventListener('click', prevGuideStep)
  els.btnGuideNext.addEventListener('click', nextGuideStep)
  els.btnGuideFinish.addEventListener('click', finishGuide)
  els.dlgGuide.addEventListener('close', () => {
    if (els.dlgGuide.returnValue !== 'ok') markGuideDone()
  })
  els.btnOpenGuide.addEventListener('click', () => {
    localStorage.removeItem(GUIDE_KEY)
    openGuide()
  })
}

function init() {
  state.settings = loadSettings()
  if (state.settings.gitPath) {
    window.gitTool.setGitPath(state.settings.gitPath).catch(() => {})
  }
  bindEvents()
  setupTabs()
  setupSettingsTabs()
  attachTemplateButtons()
  applySettingsToUI()
  renderAll()
  renderDiff('')
  els.editorWrap.style.display = 'none'
  state.editorVisible = false
  setStatus('就绪')
  if (shouldShowGuide()) {
    setTimeout(openGuide, 200)
  }
}

init()

function updateGitUI({ installed, version, path }) {
  els.gitDetectStatus.textContent = installed ? '已安装' : '未安装'
  els.gitVersion.textContent = version || '-'
  if (path) els.gitPathInput.value = path
}

async function loadGitInfo() {
  const info = await ensureOk(await window.gitTool.getGitInfo(), '读取 Git 信息失败')
  if (!info) return
  updateGitUI(info)
}

async function autoDetectGit() {
  const res = await ensureOk(await window.gitTool.detectGit(), '检测 Git 失败')
  if (!res) return
  updateGitUI(res)
  if (!res.installed) {
    await showMessageDialog({
      variant: 'warn',
      title: '未检测到 Git',
      message: '系统未检测到 Git。你可以点击“下载 Git”前往官方网站下载安装。',
      showCancel: false,
      okText: '知道了',
    })
  } else {
    saveSettings({ ...state.settings, gitPath: res.path || '' })
  }
}

async function pickGitPath() {
  const pick = await ensureOk(await window.gitTool.selectFiles({ title: '选择 git.exe' }), '选择文件失败')
  if (!pick || pick.canceled || !pick.filePaths?.length) return
  const p = pick.filePaths[0]
  els.gitPathInput.value = p
}

async function saveGitPath() {
  const p = String(els.gitPathInput.value || '').trim()
  if (!p) {
    await showAlert('提示', '请输入 Git 可执行文件路径')
    return
  }
  const rv = await ensureOk(await window.gitTool.setGitPath(p), '设置 Git 路径失败')
  if (!rv) return
  saveSettings({ ...state.settings, gitPath: p })
  await showMessageDialog({ variant: 'success', title: '成功', message: `已设置 Git 路径:\n${p}\n版本: ${rv.version || '-'}`, showCancel: false, okText: '确定' })
  await loadGitInfo()
}

async function showConflictGuide(op, source, target, details) {
  const title = '检测到合并冲突'
  const message =
    `当前操作：${op === 'pull' ? '拉取' : '合并'}\n` +
    `源分支：${source}\n` +
    `目标分支：${target}\n\n` +
    '请按以下步骤处理冲突：\n' +
    '1. 在“未暂存文件”中找到标记为冲突的文件。\n' +
    '2. 打开文件，手动解决冲突标记（<<<<<< / ====== / >>>>>>）。\n' +
    '3. 确认修改正确后，将文件暂存。\n' +
    '4. 完成冲突解决后再进行提交。\n\n' +
    '风险提示：解决冲突会改动文件内容，建议先确保团队协作无误并避免覆盖他人修改。'
  await showMessageDialog({
    variant: 'warn',
    title,
    message,
    details: details || '',
    showCancel: false,
    okText: '知道了',
  })
}
