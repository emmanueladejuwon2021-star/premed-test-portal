import app from '../src/server-app';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: any, res: any) {
  try {
    await app.ready();
    app.server.emit('request', req, res);
  } catch (error) {
    console.error("Vercel setup error:", error);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}

