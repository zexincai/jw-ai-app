/**
 * 真机调试代理 — 手机通过电脑访问内网后端
 * 用法: node proxy.js
 * 手机端 API 地址改为 http://192.168.31.127:9199
 */
const http = require('http')
const net = require('net')

const RULES = [
  { localPort: 9199, remoteHost: '100.112.82.63', remotePort: 9199 },
  { localPort: 5200, remoteHost: '100.112.82.63', remotePort: 5200 },
]

const time = () => new Date().toLocaleTimeString('zh-CN', { hour12: false })

RULES.forEach(({ localPort, remoteHost, remotePort }) => {
  http.createServer((req, res) => {
    const start = Date.now()
    const opts = {
      hostname: remoteHost,
      port: remotePort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers },
    }
    delete opts.headers.host

    console.log(`[${time()}] ← ${req.method} ${req.url}`)
    if (req.headers['content-type']) {
      console.log(`           Content-Type: ${req.headers['content-type']}`)
    }
    if (req.headers['authorization'] || req.headers['token']) {
      console.log(`           Auth: ${(req.headers['authorization'] || req.headers['token']).substring(0, 50)}...`)
    }

    // 打印请求体 (仅 JSON/表单)
    let body = ''
    req.on('data', (chunk) => { body += chunk.toString() })
    req.on('end', () => {
      if (body && body.length < 500) {
        console.log(`           Body: ${body}`)
      } else if (body) {
        console.log(`           Body: ${body.substring(0, 500)}... (${body.length} bytes)`)
      }
    })

    const proxy = http.request(opts, (backend) => {
      const ms = Date.now() - start
      console.log(`[${time()}] → ${backend.statusCode} ${req.method} ${req.url} (${ms}ms)`)
      res.writeHead(backend.statusCode, backend.headers)
      backend.pipe(res)
    })
    proxy.on('error', (e) => {
      console.log(`[${time()}] ✗ ERROR ${req.method} ${req.url}: ${e.message}`)
      res.writeHead(502)
      res.end('Proxy error: ' + e.message)
    })
    req.pipe(proxy)
  }).on('upgrade', (req, socket, head) => {
    console.log(`[${time()}] ⇅ WebSocket 升级 ${req.url}`)
    const wsProxy = net.connect(remotePort, remoteHost, () => {
      socket.write('HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n\r\n')
      wsProxy.write(head)
      socket.pipe(wsProxy).pipe(socket)
    })
    wsProxy.on('error', () => socket.destroy())
    socket.on('error', () => wsProxy.destroy())
    socket.on('close', () => {
      console.log(`[${time()}] ⇅ WebSocket 断开 ${req.url}`)
    })
  }).listen(localPort, '0.0.0.0', () => {
    console.log(`代理: 0.0.0.0:${localPort} → ${remoteHost}:${remotePort}`)
  })
})

console.log('='.repeat(55))
console.log('等待 APP 连接...')
console.log('='.repeat(55))
