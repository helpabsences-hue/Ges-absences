// usage: node render2.js <html> <out.mp4> <plan.json>
// Renders the page with each scene stretched to the real timings in plan.json (D = design, R = real).
const { chromium } = require('playwright')
const { spawn } = require('child_process')
const fs = require('fs')
;(async () => {
  const [html, out, planFile] = process.argv.slice(2)
  const { D, R } = JSON.parse(fs.readFileSync(planFile, 'utf8'))
  const toDesign = t => {
    for (let i = 0; i < R.length - 1; i++)
      if (t <= R[i + 1]) return D[i] + (t - R[i]) * (D[i + 1] - D[i]) / (R[i + 1] - R[i])
    return D[D.length - 1]
  }
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto('file://' + html)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  const FPS = 30, n = Math.round(R[R.length - 1] * FPS)
  const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-i','-',
    '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart', out], { stdio: ['pipe','inherit','inherit'] })
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => seek(t), toDesign(i / FPS))
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 })
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
    if (i % 600 === 0) console.log(`frame ${i}/${n}`)
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await browser.close()
})()
