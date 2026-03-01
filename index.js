const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const fsp = require('fs/promises')
const { spawn } = require('child_process')

function ok(data) {
  return { ok: true, data }
}

function fail(message, details) {
  return { ok: false, error: { message, details } }
}

async function pathExists(p) {
  try {
    await fsp.access(p)
    return true
  } catch {
    return false
  }
}

let gitCmd = 'git'

function runGit({ cwd, args, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn(gitCmd, args, {
      cwd,
      windowsHide: true,
      shell: false,
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (buf) => {
      stdout += buf.toString('utf8')
    })
    child.stderr.on('data', (buf) => {
      stderr += buf.toString('utf8')
    })

    let timeout
    if (timeoutMs && Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timeout = setTimeout(() => {
        child.kill()
        reject(new Error(`git 命令超时: ${gitCmd} ${args.join(' ')}`))
      }, timeoutMs)
    }

    child.on('error', reject)
    child.on('close', (code) => {
      if (timeout) clearTimeout(timeout)
      if (code === 0) resolve({ stdout, stderr })
      else reject(Object.assign(new Error(stderr || `git 命令失败: ${gitCmd} ${args.join(' ')}`), { stdout, stderr, code }))
    })
  })
}

async function ensureRepoPath(repoPath) {
  if (!repoPath || typeof repoPath !== 'string') throw new Error('未选择仓库')
  const gitDir = path.join(repoPath, '.git')
  if (!(await pathExists(gitDir))) throw new Error('所选目录不是有效的 Git 仓库')
  return repoPath
}

function assertSafeNonOptionValue(label, value) {
  const v = String(value || '').trim()
  if (!v) throw new Error(`缺少${label}参数`)
  if (v.startsWith('-')) throw new Error(`${label} 不合法`)
  return v
}

function parseStatusPorcelain(text) {
  const staged = []
  const unstaged = []

  for (const line of text.split(/\r?\n/)) {
    if (!line || line.length < 3) continue
    const x = line[0]
    const y = line[1]
    const file = line.slice(3)

    if (x !== ' ' && x !== '?') staged.push({ status: x, file, display: `[${x}] ${file}` })
    if (y !== ' ' || x === '?') unstaged.push({ status: y !== ' ' ? y : '?', file, display: `[${y !== ' ' ? y : '?'}] ${file}` })
  }

  return { staged, unstaged }
}

function inferRepoDirFromUrl(url) {
  const trimmed = String(url || '').trim().replace(/\/+$/, '')
  if (!trimmed) return ''
  const base = trimmed.split('/').pop() || ''
  return base.endsWith('.git') ? base.slice(0, -4) : base
}

async function copyFilePreserveTimes(src, dst) {
  const stat = await fsp.stat(src)
  await fsp.copyFile(src, dst)
  await fsp.utimes(dst, stat.atime, stat.mtime)
}

function ensureFileInsideRepo(repoPath, relPath) {
  const repoAbs = path.resolve(repoPath)
  const p = String(relPath || '').trim()
  if (!p) throw new Error('缺少文件参数')
  if (p.startsWith('-')) throw new Error('文件参数不合法')
  const full = path.resolve(repoAbs, p)
  if (full === repoAbs || !full.startsWith(repoAbs + path.sep)) throw new Error('文件必须位于当前仓库内')
  return full
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 700,
    backgroundColor: '#f0f0f0',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'favicon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  win.setMenuBarVisibility(false)
  win.removeMenu()
  await win.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

function isLikelyGitExecutable(p) {
  const ext = path.extname(p).toLowerCase()
  const base = path.basename(p).toLowerCase()
  return (ext === '.exe' || ext === '') && (base === 'git' || base === 'git.exe')
}

async function execVersion(cmdPath) {
  return new Promise((resolve) => {
    const child = spawn(cmdPath, ['--version'], { windowsHide: true, shell: false })
    let out = ''
    let err = ''
    child.stdout.on('data', (b) => (out += b.toString('utf8')))
    child.stderr.on('data', (b) => (err += b.toString('utf8')))
    child.on('error', () => resolve({ ok: false, version: '', stderr: err }))
    child.on('close', (code) => {
      if (code === 0) resolve({ ok: true, version: (out || '').trim(), stderr: '' })
      else resolve({ ok: false, version: '', stderr: err })
    })
  })
}

ipcMain.handle('git:getGitInfo', async () => {
  try {
    const v = await execVersion(gitCmd)
    return ok({ cmd: gitCmd, installed: Boolean(v.ok), version: v.version })
  } catch (e) {
    return fail('读取 Git 信息失败', String(e?.message || e))
  }
})

ipcMain.handle('git:detectGit', async () => {
  try {
    // Try where.exe
    let found = ''
    await new Promise((resolve) => {
      const child = spawn('where', ['git'], { windowsHide: true, shell: false })
      let out = ''
      child.stdout.on('data', (b) => (out += b.toString('utf8')))
      child.on('error', () => resolve(null))
      child.on('close', (code) => {
        if (code === 0) {
          const lines = (out || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
          for (const line of lines) {
            if (isLikelyGitExecutable(line)) {
              found = line
              break
            }
          }
        }
        resolve(null)
      })
    })
    // Fallback candidates
    const candidates = [
      found,
      'C:\\Program Files\\Git\\bin\\git.exe',
      'C:\\Program Files\\Git\\cmd\\git.exe',
      'C:\\Program Files (x86)\\Git\\bin\\git.exe',
      'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
      path.join(process.env.USERPROFILE || '', 'scoop', 'apps', 'git', 'current', 'bin', 'git.exe'),
      path.join(process.env.ChocolateyInstall || 'C:\\ProgramData\\chocolatey', 'bin', 'git.exe'),
    ].filter((p) => p && typeof p === 'string')
    let usable = ''
    let version = ''
    for (const c of candidates) {
      const p = c
      if (!p) continue
      if (!(await pathExists(p))) continue
      if (!isLikelyGitExecutable(p)) continue
      const rv = await execVersion(p)
      if (rv.ok) {
        usable = p
        version = rv.version
        break
      }
    }
    // Last resort: try PATH
    if (!usable) {
      const rv = await execVersion('git')
      if (rv.ok) {
        usable = 'git'
        version = rv.version
      }
    }
    const installed = Boolean(usable)
    if (installed) gitCmd = usable
    return ok({ installed, path: usable, version })
  } catch (e) {
    return fail('检测 Git 安装失败', String(e?.message || e))
  }
})

ipcMain.handle('git:setGitPath', async (_evt, { gitPath }) => {
  try {
    const p = String(gitPath || '').trim()
    if (!p) throw new Error('请填写 Git 可执行文件路径')
    if (!isLikelyGitExecutable(p)) throw new Error('无效 Git 路径')
    if (!(await pathExists(p))) throw new Error('路径不存在')
    const rv = await execVersion(p)
    if (!rv.ok) throw new Error('该路径无法正常运行 Git')
    gitCmd = p
    return ok({ cmd: gitCmd, version: rv.version })
  } catch (e) {
    return fail('设置 Git 路径失败', String(e?.message || e))
  }
})

ipcMain.handle('app:openExternal', async (_evt, url) => {
  try {
    const u = String(url || '').trim()
    if (!u) throw new Error('缺少 URL')
    await shell.openExternal(u)
    return ok({})
  } catch (e) {
    return fail('打开外部链接失败', String(e?.message || e))
  }
})

ipcMain.handle('dialog:selectRepo', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择 Git 仓库',
    })
    if (result.canceled || !result.filePaths[0]) return ok({ canceled: true })
    const repoPath = result.filePaths[0]
    const isRepo = await pathExists(path.join(repoPath, '.git'))
    return ok({ canceled: false, repoPath, isRepo })
  } catch (e) {
    return fail('打开仓库失败', String(e?.message || e))
  }
})

ipcMain.handle('dialog:selectFiles', async (_evt, { title } = {}) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      title: title || '选择文件',
    })
    if (result.canceled) return ok({ canceled: true, filePaths: [] })
    return ok({ canceled: false, filePaths: result.filePaths || [] })
  } catch (e) {
    return fail('选择文件失败', String(e?.message || e))
  }
})

ipcMain.handle('dialog:selectDir', async (_evt, { title, initialDir } = {}) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: title || '选择目录',
      defaultPath: initialDir,
    })
    if (result.canceled || !result.filePaths[0]) return ok({ canceled: true })
    return ok({ canceled: false, dirPath: result.filePaths[0] })
  } catch (e) {
    return fail('选择目录失败', String(e?.message || e))
  }
})

ipcMain.handle('app:getInfo', async () => {
  try {
    return ok({
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    })
  } catch (e) {
    return fail('读取应用信息失败', String(e?.message || e))
  }
})

ipcMain.handle('fs:readFile', async (_evt, { repoPath, file }) => {
  try {
    const cwd = await ensureRepoPath(repoPath)
    const f = assertSafeNonOptionValue('文件', file)
    const repoAbs = path.resolve(cwd)
    const abs = path.resolve(cwd, f)
    if (abs !== repoAbs && !abs.startsWith(repoAbs + path.sep)) throw new Error('文件必须在当前仓库内')
    const content = await fsp.readFile(abs, 'utf8')
    return ok({ content })
  } catch (e) {
    return fail('读取文件失败', String(e?.message || e))
  }
})

ipcMain.handle('fs:writeFile', async (_evt, { repoPath, file, content }) => {
  try {
    const cwd = await ensureRepoPath(repoPath)
    const f = assertSafeNonOptionValue('文件', file)
    const repoAbs = path.resolve(cwd)
    const abs = path.resolve(cwd, f)
    if (abs !== repoAbs && !abs.startsWith(repoAbs + path.sep)) throw new Error('文件必须在当前仓库内')
    await fsp.writeFile(abs, String(content ?? ''), 'utf8')
    return ok({})
  } catch (e) {
    return fail('写入文件失败', String(e?.message || e))
  }
})

ipcMain.handle('git:refresh', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    const [{ stdout: branchOut }, { stdout: statusOut }] = await Promise.all([
      runGit({ cwd: repoPath, args: ['branch', '--show-current'] }),
      runGit({ cwd: repoPath, args: ['status', '--porcelain'] }),
    ])
    const branch = (branchOut || '').trim() || 'detached'
    const { staged, unstaged } = parseStatusPorcelain(statusOut || '')
    return ok({ branch, staged, unstaged })
  } catch (e) {
    return fail('刷新失败', String(e?.message || e))
  }
})

ipcMain.handle('git:diff', async (_evt, { repoPath, file, cached }) => {
  try {
    await ensureRepoPath(repoPath)
    const f = assertSafeNonOptionValue('文件', file)
    const args = cached ? ['diff', '--cached', '--', f] : ['diff', '--', f]
    const { stdout } = await runGit({ cwd: repoPath, args })
    return ok({ diff: stdout || '' })
  } catch (e) {
    return fail('加载差异失败', String(e?.message || e))
  }
})

ipcMain.handle('git:readFile', async (_evt, { repoPath, file }) => {
  try {
    await ensureRepoPath(repoPath)
    const full = ensureFileInsideRepo(repoPath, file)
    const stat = await fsp.stat(full)
    if (stat.size > 2 * 1024 * 1024) throw new Error('文件过大，建议使用外部编辑器')
    const content = await fsp.readFile(full, 'utf8')
    return ok({ content })
  } catch (e) {
    return fail('读取文件失败', String(e?.message || e))
  }
})

ipcMain.handle('git:writeFile', async (_evt, { repoPath, file, content }) => {
  try {
    await ensureRepoPath(repoPath)
    const full = ensureFileInsideRepo(repoPath, file)
    const data = typeof content === 'string' ? content : ''
    await fsp.writeFile(full, data, 'utf8')
    return ok({})
  } catch (e) {
    return fail('写入文件失败', String(e?.message || e))
  }
})

ipcMain.handle('git:add', async (_evt, { repoPath, files }) => {
  try {
    await ensureRepoPath(repoPath)
    if (!Array.isArray(files) || files.length === 0) throw new Error('未选择文件')
    for (const file of files) {
      if (!file || typeof file !== 'string') continue
      const f = assertSafeNonOptionValue('文件', file)
      await runGit({ cwd: repoPath, args: ['add', '--', f] })
    }
    return ok({})
  } catch (e) {
    return fail('添加文件失败', String(e?.message || e))
  }
})

ipcMain.handle('git:addAll', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    await runGit({ cwd: repoPath, args: ['add', '-A'] })
    return ok({})
  } catch (e) {
    return fail('添加全部失败', String(e?.message || e))
  }
})

ipcMain.handle('git:reset', async (_evt, { repoPath, files }) => {
  try {
    await ensureRepoPath(repoPath)
    if (!Array.isArray(files) || files.length === 0) throw new Error('未选择文件')
    for (const file of files) {
      if (!file || typeof file !== 'string') continue
      const f = assertSafeNonOptionValue('文件', file)
      await runGit({ cwd: repoPath, args: ['reset', 'HEAD', '--', f] })
    }
    return ok({})
  } catch (e) {
    return fail('重置失败', String(e?.message || e))
  }
})

ipcMain.handle('git:resetAll', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    await runGit({ cwd: repoPath, args: ['reset', 'HEAD'] })
    return ok({})
  } catch (e) {
    return fail('重置全部失败', String(e?.message || e))
  }
})

ipcMain.handle('git:commit', async (_evt, { repoPath, message }) => {
  try {
    await ensureRepoPath(repoPath)
    const msg = String(message || '').trim()
    if (!msg) throw new Error('请输入提交信息')
    const { stdout } = await runGit({ cwd: repoPath, args: ['commit', '-m', msg] })
    return ok({ output: stdout || '' })
  } catch (e) {
    return fail('提交失败', String(e?.message || e))
  }
})

ipcMain.handle('git:push', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    const { stdout, stderr } = await runGit({ cwd: repoPath, args: ['push'] }).catch(async (err) => {
      const msg = String(err?.stderr || err?.message || '')
      if (!/no upstream branch/i.test(msg)) throw err
      const { stdout: branchOut } = await runGit({ cwd: repoPath, args: ['branch', '--show-current'] })
      const branch = (branchOut || '').trim() || 'master'
      return runGit({ cwd: repoPath, args: ['push', '--set-upstream', 'origin', branch] })
    })
    return ok({ output: (stdout || '') + (stderr ? `\n${stderr}` : '') })
  } catch (e) {
    return fail('推送失败', String(e?.message || e))
  }
})

ipcMain.handle('git:getUser', async (_evt, { repoPath, scope }) => {
  try {
    const sc = String(scope || '').trim()
    const useGlobal = sc === 'global' || (!sc && !repoPath)
    const cwd = useGlobal ? process.cwd() : await ensureRepoPath(repoPath)
    const configScope = useGlobal ? ['--global'] : []
    const [{ stdout: nameOut }, { stdout: emailOut }] = await Promise.all([
      runGit({ cwd, args: ['config', ...configScope, 'user.name'] }).catch(() => ({ stdout: '' })),
      runGit({ cwd, args: ['config', ...configScope, 'user.email'] }).catch(() => ({ stdout: '' })),
    ])
    return ok({ name: (nameOut || '').trim(), email: (emailOut || '').trim() })
  } catch (e) {
    return fail('读取用户信息失败', String(e?.message || e))
  }
})

ipcMain.handle('git:setUser', async (_evt, { repoPath, name, email, scope }) => {
  try {
    const sc = String(scope || '').trim()
    const useGlobal = sc === 'global' || (!sc && !repoPath)
    const cwd = useGlobal ? process.cwd() : await ensureRepoPath(repoPath)
    const configScope = useGlobal ? ['--global'] : []
    const n = String(name || '').trim()
    const em = String(email || '').trim()
    if (!n || !em) throw new Error('用户名和邮箱不能为空')
    await runGit({ cwd, args: ['config', ...configScope, 'user.name', n] })
    await runGit({ cwd, args: ['config', ...configScope, 'user.email', em] })
    return ok({})
  } catch (e) {
    return fail('设置用户失败', String(e?.message || e))
  }
})

ipcMain.handle('git:init', async (_evt, { dirPath }) => {
  try {
    if (!dirPath || typeof dirPath !== 'string') throw new Error('缺少目录参数')
    const gitDir = path.join(dirPath, '.git')
    if (await pathExists(gitDir)) throw new Error('该目录已经是 Git 仓库')
    const { stdout } = await runGit({ cwd: dirPath, args: ['init'] })
    return ok({ output: stdout || '', repoPath: dirPath })
  } catch (e) {
    return fail('初始化失败', String(e?.message || e))
  }
})

ipcMain.handle('git:clone', async (_evt, { url, parentDir }) => {
  try {
    const u = assertSafeNonOptionValue('远程仓库 URL', url)
    const p = String(parentDir || '').trim()
    if (!p) throw new Error('请选择目标父目录')
    const { stdout } = await runGit({ cwd: p, args: ['clone', u], timeoutMs: 60 * 60 * 1000 })
    const guess = inferRepoDirFromUrl(u)
    let clonePath = guess ? path.join(p, guess) : ''
    if (!clonePath || !(await pathExists(path.join(clonePath, '.git')))) {
      const entries = await fsp.readdir(p, { withFileTypes: true }).catch(() => [])
      const dirs = []
      for (const e of entries) {
        if (!e.isDirectory()) continue
        const full = path.join(p, e.name)
        if (await pathExists(path.join(full, '.git'))) dirs.push(full)
      }
      if (dirs.length) {
        const stats = await Promise.all(dirs.map(async (d) => ({ d, t: (await fsp.stat(d)).mtimeMs })))
        stats.sort((a, b) => b.t - a.t)
        clonePath = stats[0].d
      } else {
        clonePath = guess ? path.join(p, guess) : p
      }
    }
    return ok({ output: stdout || '', repoPath: clonePath })
  } catch (e) {
    return fail('克隆失败', String(e?.message || e))
  }
})

ipcMain.handle('git:getRemote', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    const { stdout } = await runGit({ cwd: repoPath, args: ['remote', '-v'] }).catch(() => ({ stdout: '' }))
    let originUrl = ''
    for (const line of (stdout || '').split(/\r?\n/)) {
      if (!line.startsWith('origin')) continue
      const parts = line.trim().split(/\s+/)
      if (parts[1]) {
        originUrl = parts[1]
        break
      }
    }
    return ok({ originUrl })
  } catch (e) {
    return fail('读取远程仓库失败', String(e?.message || e))
  }
})

ipcMain.handle('git:setRemote', async (_evt, { repoPath, url }) => {
  try {
    await ensureRepoPath(repoPath)
    const u = assertSafeNonOptionValue('远程仓库 URL', url)
    const { stdout } = await runGit({ cwd: repoPath, args: ['remote', '-v'] }).catch(() => ({ stdout: '' }))
    const hasOrigin = (stdout || '').split(/\r?\n/).some((line) => line.trim().startsWith('origin '))
    if (hasOrigin) await runGit({ cwd: repoPath, args: ['remote', 'set-url', 'origin', u] })
    else await runGit({ cwd: repoPath, args: ['remote', 'add', 'origin', u] })
    return ok({})
  } catch (e) {
    return fail('设置远程仓库失败', String(e?.message || e))
  }
})

ipcMain.handle('git:removeRemote', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    await runGit({ cwd: repoPath, args: ['remote', 'remove', 'origin'] })
    return ok({})
  } catch (e) {
    return fail('移除远程仓库失败', String(e?.message || e))
  }
})

ipcMain.handle('git:listBranches', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    const [{ stdout: localOut }, { stdout: remoteOut }, { stdout: currentOut }] = await Promise.all([
      runGit({ cwd: repoPath, args: ['branch', '--list'] }),
      runGit({ cwd: repoPath, args: ['branch', '-r'] }).catch(() => ({ stdout: '' })),
      runGit({ cwd: repoPath, args: ['branch', '--show-current'] }).catch(() => ({ stdout: '' })),
    ])
    const local = (localOut || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith('*') ? s.slice(1).trim() : s))
    const remote = (remoteOut || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
    const current = (currentOut || '').trim() || ''
    return ok({ local, remote, current })
  } catch (e) {
    return fail('加载分支失败', String(e?.message || e))
  }
})

ipcMain.handle('git:checkout', async (_evt, { repoPath, branch }) => {
  try {
    await ensureRepoPath(repoPath)
    const b = assertSafeNonOptionValue('分支', branch)
    await runGit({ cwd: repoPath, args: ['checkout', b] })
    return ok({})
  } catch (e) {
    return fail('切换分支失败', String(e?.message || e))
  }
})

ipcMain.handle('git:checkoutRemote', async (_evt, { repoPath, remoteBranch, localName }) => {
  try {
    await ensureRepoPath(repoPath)
    const rb = assertSafeNonOptionValue('远程分支', remoteBranch)
    const ln = assertSafeNonOptionValue('本地分支', localName)
    await runGit({ cwd: repoPath, args: ['checkout', '-b', ln, rb] })
    return ok({})
  } catch (e) {
    return fail('检出远程分支失败', String(e?.message || e))
  }
})

ipcMain.handle('git:createBranch', async (_evt, { repoPath, branchName, baseBranch }) => {
  try {
    await ensureRepoPath(repoPath)
    const name = assertSafeNonOptionValue('分支名称', branchName)
    const base = assertSafeNonOptionValue('基础分支', baseBranch)
    if (/\s/.test(name)) throw new Error('分支名称不能包含空白字符')
    await runGit({ cwd: repoPath, args: ['checkout', '-b', name, base] })
    return ok({})
  } catch (e) {
    return fail('创建分支失败', String(e?.message || e))
  }
})

ipcMain.handle('git:mergePull', async (_evt, { repoPath, op, source, target }) => {
  try {
    await ensureRepoPath(repoPath)
    const o = String(op || '').trim()
    const src = assertSafeNonOptionValue('源分支', source)
    const tgt = assertSafeNonOptionValue('目标分支', target)

    if (o === 'pull') {
      const parts = src.includes('/') ? src.split('/', 2) : ['origin', src]
      const remote = parts[0] || 'origin'
      const branch = parts[1] || src
      const { stdout } = await runGit({ cwd: repoPath, args: ['pull', remote, branch] })
      return ok({ output: stdout || '' })
    }

    await runGit({ cwd: repoPath, args: ['checkout', tgt] })
    const { stdout } = await runGit({ cwd: repoPath, args: ['merge', src] })
    return ok({ output: stdout || '' })
  } catch (e) {
    return fail('合并/拉取失败', String(e?.message || e))
  }
})

ipcMain.handle('git:log', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    const { stdout } = await runGit({ cwd: repoPath, args: ['log', '--oneline', '--graph', '--all', '--decorate', '-30'] })
    return ok({ output: stdout || '' })
  } catch (e) {
    return fail('读取日志失败', String(e?.message || e))
  }
})

ipcMain.handle('git:listCommits', async (_evt, { repoPath }) => {
  try {
    await ensureRepoPath(repoPath)
    const { stdout } = await runGit({ cwd: repoPath, args: ['log', '--oneline', '-20'] })
    const commits = (stdout || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf(' ')
        if (idx === -1) return { hash: line, message: '' }
        return { hash: line.slice(0, idx), message: line.slice(idx + 1) }
      })
    return ok({ commits })
  } catch (e) {
    return fail('读取提交记录失败', String(e?.message || e))
  }
})

ipcMain.handle('git:resetToCommit', async (_evt, { repoPath, commitHash, mode }) => {
  try {
    await ensureRepoPath(repoPath)
    const hash = String(commitHash || '').trim()
    const m = String(mode || '').trim()
    if (!hash) throw new Error('缺少提交参数')
    if (!['soft', 'mixed', 'hard'].includes(m)) throw new Error('无效回退类型')
    await runGit({ cwd: repoPath, args: ['reset', `--${m}`, hash] })
    return ok({})
  } catch (e) {
    return fail('回退失败', String(e?.message || e))
  }
})

ipcMain.handle('git:addExternal', async (_evt, { repoPath, filePaths, destDir, allowOverwrite }) => {
  try {
    await ensureRepoPath(repoPath)
    const files = Array.isArray(filePaths) ? filePaths.filter((p) => typeof p === 'string' && p.trim()) : []
    if (files.length === 0) throw new Error('未选择文件')

    const repoAbs = path.resolve(repoPath)
    const dest = destDir ? path.resolve(destDir) : repoAbs
    if (dest !== repoAbs && !dest.startsWith(repoAbs + path.sep)) throw new Error('目标目录必须在当前仓库内')

    const results = { added: 0, copied: 0, skipped: 0 }
    const conflicts = []

    for (const src of files) {
      const absSrc = path.resolve(src)
      if (absSrc === repoAbs || absSrc.startsWith(repoAbs + path.sep)) {
        const rel = path.relative(repoAbs, absSrc)
        await runGit({ cwd: repoAbs, args: ['add', '--', rel] })
        results.added += 1
        continue
      }

      const filename = path.basename(absSrc)
      const dst = path.join(dest, filename)

      if (fs.existsSync(dst) && !allowOverwrite) {
        conflicts.push(dst)
        results.skipped += 1
        continue
      }

      await copyFilePreserveTimes(absSrc, dst)
      const rel = path.relative(repoAbs, dst)
      await runGit({ cwd: repoAbs, args: ['add', '--', rel] })
      results.added += 1
      results.copied += 1
    }

    return ok({ results, conflicts })
  } catch (e) {
    return fail('添加外部文件失败', String(e?.message || e))
  }
})

