const dgram = require('dgram')
const dns = require('dns')
const server = dgram.createSocket('udp4')
const message = Buffer.alloc(20)
const raw = require('raw-socket')

const socket = raw.createSocket(
  {
    protocol: raw.Protocol.ICMP
  }
)
socket.on('message', (buffer, source) => {
  console.log('Received ' + buffer.length + ' bytes from ' + source)
})

server.on('err', err => {
  console.log(`server error : \n${err.stack}`)
  server.close()
})

server.on('message', (msg, rinfo) => {
  console.log(`server got : ${msg} from ${rinfo.address} : ${rinfo.port}`)
})

server.on('listening', () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
  server.setTTL(2)
  dnsLookup('www.google.com')
})

const dnsLookup = destAddr => {
  dns.resolve(destAddr, (err, records) => {
    if (err) console.log('[dnsLookup] err = ', err)
    console.log('[dnsLookup] records = ', records[0])
    server.send(message, 33435, records[0], (err, byte) => {
      if (err) console.log(err)
      console.log('byte = ', byte)
      server.close()
    })
  })
}
server.bind(8000)
