import sha1 from 'sha1';
import dbClient from '../utils/db';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) { return res.status(400).json({ error: 'Missing email' }); }
    if (!password) { return res.status(400).json({ error: 'Missing password' }); }

    const userCollection = await dbClient.userCollection;
    const emailAdd = await userCollection.findOne({ email });
    if (emailAdd) { return res.status(400).json({ error: 'Already exist' }); }

    const passwordHash = sha1(password);

    const newUser = await userCollection.insertOne({ email, password: passwordHash });
    return res.status(201).json({ id: newUser.insertedId, email });
  }
}

export default UsersController;
