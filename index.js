#!/usr/bin/env node
const rawSocket = require('raw-socket')
const dgram = require('dgram')
const DNS = require('dns')
const message = Buffer.from('Ping')
const yargs = require('yargs')

const cli = function () {
  const argv = yargs
  .alias('w', 'wait')
  .alias('m', 'maxHop')
  .alias('d', 'dest')
  .usage('Usage: $0 [-d URL] [-w time] [-m maxHop]')
  .example('$0 -w 3000 -m 16 -d google.com')
  .describe('w', 'Wait in milliseconds time for each ICMP response')
  .describe('m', 'Max number of hops before reaching destination')
  .describe('d', 'Destination URL')
  .demandOption('d')
  .string('d')
  .default('w', 5000)
  .default('m', 64)
  .help('h')
  .alias('h', 'help')
  .fail(handleFailure)
  .argv

  // Temp variables
  let dest = argv.d
  let MAX_HOPS = argv.m
  let TIME_LIMIT = argv.w

  const resolveDest = (dest, port, cb) => {
    DNS.resolve(dest, (err, addresses) => {
      if (err) {
        console.log('Invalid destination')
        process.exit(9)
      }
      cb(addresses[0])
    })
  }

  const ping = (destIP, ttl, cb) => {
    const timerObj = {
      sentTime: '',
      timeout: true
    }
    let udp4Socket = dgram.createSocket('udp4')
    udp4Socket.bind(8000)
    handleUDPlistening(udp4Socket, destIP, timerObj, ttl)
    let ICMPsocket = rawSocket.createSocket({
      protocol: rawSocket.Protocol.ICMP
    })
    handleICMPMssage(timerObj, ICMPsocket, udp4Socket, ttl, cb)
    handleICMPError(ICMPsocket)
    handleUDPError(udp4Socket)
    setTimeout(() => {
      if (timerObj.timeout) {
        udp4Socket.close()
        ICMPsocket.close()
        cb(null, '* * *', TIME_LIMIT)
      }
    }, TIME_LIMIT)
  }

  const handleUDPError = udp4Socket => {
    udp4Socket.on('err', err => {
      if (err) process.exit(1)
    })
  }

  const handleICMPError = ICMPsocket => {
    ICMPsocket.on('err', err => {
      if (err) process.exit(1)
    })
  }

  const handleUDPlistening = (udp4Socket, destIP, timerObj, ttl) => {
    udp4Socket.on('listening', () => {
      udp4Socket.setTTL(ttl)
      udp4Socket.send(message, 33435, destIP, (err, byte) => {
        if (err) console.log(err)
        timerObj.sentTime = new Date().getTime()
      })
    })
  }

  const handleICMPMssage = (timerObj, ICMPsocket, udp4Socket, ttl, cb) => {
    ICMPsocket.on('message', (buffer, source) => {
      udp4Socket.close()
      timerObj.timeout = false
      cb(buffer, source, (new Date().getTime() - timerObj.sentTime))
      ICMPsocket.close()
    })
  }

  const traceRoute = (destIP, ttl) => {
    ping(destIP, ttl, (buffer, source, time) => {
      console.log(ttl + '\t' + source + '\t\n')
      if (source === destIP || ttl === MAX_HOPS) process.exit(0)
      traceRoute(destIP, ttl + 1)
    })
  }

  function handleFailure (msg, err, yargs) {
    console.error('You broke it!')
    console.error(msg)
    console.error('You should be doing', yargs.help())
    process.exit(1)
  }

  resolveDest(dest, process.env.PORT || 8000, (destIP, domains) => {
    traceRoute(destIP, 1)
  })
}

exports.cli = cli
