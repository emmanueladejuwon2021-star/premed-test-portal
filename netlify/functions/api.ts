import awsLambdaFastify from '@fastify/aws-lambda';
import app from '../../src/server-app';
import { connectDB } from '../../src/db';

let proxy: any;

export const handler = async (event: any, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    if (!proxy) {
      proxy = awsLambdaFastify(app, { serializeLambdaArguments: true });
      await app.ready();
    }

    // Rewrite event path to strip /.netlify/functions prefix so Fastify matches /api/...
    if (event.path) {
      if (event.path.startsWith('/.netlify/functions/api/')) {
        event.path = event.path.replace('/.netlify/functions/api/', '/api/');
      } else if (event.path === '/.netlify/functions/api') {
        event.path = '/api';
      }
    }

    return await proxy(event, context);
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message, stack: err.stack, type: "lambda-crash" })
    };
  }
};
