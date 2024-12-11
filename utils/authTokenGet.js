const authTokenGet = (req, res, next) => {
  const xToken = req.headers['x-token'];
  req.token = xToken;
  return next();
};

export default authTokenGet;
