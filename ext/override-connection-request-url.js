const os = require('os');

function getHostIp() {
  const interfaces = os.networkInterfaces();

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (
        iface.family === 'IPv4' &&
        !iface.internal &&
        !iface.address.startsWith('172.') && // biasanya IP container bridge
        !iface.address.startsWith('100.')    // IP Docker network kamu
      ) {
        return iface.address;
      }
    }
  }

  return '127.0.0.1'; // fallback
}

module.exports = ({ device }) => {
  const ip = getHostIp();
  const port = 7547;
  return `http://${ip}:${port}/`;
};
