const fs = require('fs')
const path = require('path')
const pngToIco = require('png-to-ico')

async function main() {
  const cwd = __dirname
  const srcCandidates = ['icon.ico', 'icon.png', 'favicon.ico', 'favicon.png']
  let src = ''
  for (const name of srcCandidates) {
    const p = path.join(cwd, name)
    if (fs.existsSync(p)) {
      src = p
      break
    }
  }
  if (!src) {
    console.error('no source icon found (icon.ico/icon.png/favicon.ico/favicon.png)')
    process.exit(1)
  }
  const outDir = path.join(cwd, 'build')
  const outFile = path.join(outDir, 'icon.ico')
  fs.mkdirSync(outDir, { recursive: true })
  try {
    const buf = await pngToIco(src)
    fs.writeFileSync(outFile, buf)
    console.log('icon generated:', outFile)
  } catch (e) {
    console.error('convert failed:', e?.message || e)
    process.exit(1)
  }
}

main()
