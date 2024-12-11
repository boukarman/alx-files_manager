import sha1 from 'sha1';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AuthController {
  static async getConnect(req, res) {
    const { email, password } = req.auth;
    const user = await dbClient.userCollection.findOne({ email });
    if (!user) { return res.status(401).json({ error: 'Unauthorized' }); }
    const passwordHash = sha1(password);
    if (passwordHash !== user.password) { return res.status(401).json({ error: 'Unauthorized' }); }
    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 86400);
    return res.status(200).json({ token });
  }

  static async getDisconnect(req, res) {
    const { token } = req;
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const key = `auth_${token}`;
    const userID = await redisClient.get(key);
    // console.log('Inside getDisconnect', token, key);
    if (!userID) { return res.status(401).json({ error: 'Unauthorized' }); }
    await redisClient.del(key);
    return res.status(204).json({});
  }

  static async getMe(req, res) {
    const { token } = req;
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }

    const key = `auth_${token}`;
    const userID = await redisClient.get(key);
    // console.log('Inside getDisconnect', token, key);
    if (!userID) { return res.status(401).json({ error: 'Unauthorized' }); }
    // console.log(userID);
    const user = await dbClient.userCollection.findOne({ _id: ObjectId(userID) });
    // console.log(user);
    if (!user) { return res.status(401).json({ error: 'Unauthorized' }); }
    const userObj = { email: user.email, id: userID };

    return res.status(200).json(userObj);
  }
}

export default AuthController;
