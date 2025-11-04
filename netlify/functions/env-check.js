exports.handler = async () => ({
  statusCode: 200,
  body: JSON.stringify({ DATABASE_URL_set: !!process.env.DATABASE_URL })
});