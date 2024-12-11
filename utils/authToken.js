/**
 * Middleware function to authenticate requests by checking the 'x-token' header.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @param {Function} next - The next middleware function.
 * @return {void} If the 'x-token' header is missing, returns a 401 status with an error message.
 *                 Otherwise, sets the 'token' property of the request object to the value of the
 *                 'x-token' header and calls the next middleware function.
 */
const authToken = (req, res, next) => {
  const xToken = req.headers['x-token'];
  if (!xToken) { return res.status(401).json({ error: 'Unauthorized' }); }
  req.token = xToken;
  return next();
};

export default authToken;
