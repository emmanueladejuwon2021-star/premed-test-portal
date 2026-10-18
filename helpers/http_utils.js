/**
 * Helper utility for handling HTTP/HTTPS response streams.
 */

/**
 * Reads an incoming HTTP/HTTPS response stream, accumulates chunk data,
 * and parses it as JSON.
 *
 * @param {import('node:http').IncomingMessage} res - The HTTP response stream.
 * @param {string} [logTag='[TURSO PARSE ERROR]'] - Prefix tag for error logging.
 * @returns {Promise<any|null>} Resolves with parsed JSON object or null on error.
 */
function parseJsonResponse(res, logTag = '[TURSO PARSE ERROR]') {
  return new Promise((resolve) => {
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });
    res.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        console.error(logTag, e.message);
        resolve(null);
      }
    });
    res.on('error', (e) => {
      console.error(logTag, e.message);
      resolve(null);
    });
  });
}

module.exports = {
  parseJsonResponse
};
