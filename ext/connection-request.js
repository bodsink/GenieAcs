// Extension script untuk menangani Connection Request dengan real IP
// File: ext/connection-request.js

const url = require('url');
const http = require('http');

// Function untuk mendapatkan real IP dari request headers
function getRealClientIP(headers, remoteAddress) {
  // Cek X-Forwarded-For header (dari reverse proxy/load balancer)
  if (headers['x-forwarded-for']) {
    const forwardedIps = headers['x-forwarded-for'].split(',');
    return forwardedIps[0].trim();
  }

  // Cek X-Real-IP header (dari nginx/proxy)
  if (headers['x-real-ip']) {
    return headers['x-real-ip'].trim();
  }

  // Cek CF-Connecting-IP (dari Cloudflare)
  if (headers['cf-connecting-ip']) {
    return headers['cf-connecting-ip'].trim();
  }

  // Default ke remote address
  return remoteAddress;
}

// Hook untuk CWMP session
function onCwmpRequest(sessionData, rpc) {
  // Ambil real IP dari request
  const realIP = getRealClientIP(sessionData.httpRequest.headers, sessionData.httpRequest.connection.remoteAddress);

  // Update device dengan real IP
  if (realIP && realIP !== '127.0.0.1' && !realIP.startsWith('172.')) {
    sessionData.deviceData = sessionData.deviceData || {};
    sessionData.deviceData._remoteAddress = realIP;

    // Log untuk debugging
    console.log(`Device ${sessionData.deviceId} real IP: ${realIP}`);
  }
}

// Hook untuk Connection Request
function onConnectionRequest(deviceId, connectionRequestUrl, username, password) {
  // Parse URL untuk mendapatkan IP dan port
  const parsedUrl = url.parse(connectionRequestUrl);
  const targetIP = parsedUrl.hostname;
  const targetPort = parsedUrl.port || 80;

  console.log(`Sending Connection Request to ${targetIP}:${targetPort} for device ${deviceId}`);

  // Custom implementation untuk Connection Request
  return new Promise((resolve, reject) => {
    const options = {
      hostname: targetIP,
      port: targetPort,
      path: parsedUrl.path || '/',
      method: 'GET',
      timeout: 5000,
      headers: {
        'User-Agent': 'GenieACS/1.2',
        'Connection': 'close'
      }
    };

    // Add authentication if provided
    if (username && password) {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      options.headers['Authorization'] = `Basic ${auth}`;
    }

    const req = http.request(options, (res) => {
      console.log(`Connection Request response: ${res.statusCode} for device ${deviceId}`);

      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve();
      } else {
        reject(new Error(`HTTP ${res.statusCode}`));
      }
    });

    req.on('error', (err) => {
      console.error(`Connection Request failed for device ${deviceId}:`, err.message);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`Connection Request timeout for device ${deviceId}`);
      reject(new Error('Connection timeout'));
    });

    req.end();
  });
}

// Export functions
module.exports = {
  onCwmpRequest,
  onConnectionRequest,
  getRealClientIP
};
