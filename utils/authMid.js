const authMid = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const credentials = Buffer.from(token, 'base64').toString('ascii');
  const [email, password] = credentials.split(':');
  if (!email || !password) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.auth = { email, password };
  return next();
};

export default authMid;
