// usage: node render.js <html> <out> [stills t1,t2,...]
const { chromium } = require('playwright')
const { spawn } = require('child_process')
;(async () => {
  const [html, out, stills] = process.argv.slice(2)
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto('file://' + html)
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(500)
  if (stills) {
    for (const t of stills.split(',')) {
      await page.evaluate(t => seek(t), parseFloat(t))
      await page.screenshot({ path: `${out}-${t}.png` })
    }
  } else {
    const FPS = 30, dur = await page.evaluate(() => DUR)
    const ff = spawn('ffmpeg', ['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-i','-',
      '-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart', out], { stdio: ['pipe','inherit','inherit'] })
    const n = Math.round(dur * FPS)
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => seek(t), i / FPS)
      const buf = await page.screenshot({ type: 'jpeg', quality: 95 })
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r))
      if (i % 300 === 0) console.log(`frame ${i}/${n}`)
    }
    ff.stdin.end()
    await new Promise(r => ff.on('close', r))
  }
  await browser.close()
})()
