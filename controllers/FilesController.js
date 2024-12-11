import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { ObjectId } from 'mongodb';
import { lookup, contentType } from 'mime-types';
// import path from 'path';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class FileController {
  static async postUpload(req, res) {
    const { token } = req;
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) { return res.status(401).json({ error: 'Unauthorized' }); }
    const user = await dbClient.userCollection.findOne({ _id: ObjectId(userId) });
    if (!user) { return res.status(401).json({ error: 'Unauthorized' }); }
    const fileInfo = req.body;
    // console.log(fileInfo, typeof fileInfo);

    const allowedTypes = ['folder', 'file', 'image'];
    if (!fileInfo.name) { return res.status(400).json({ error: 'Missing name' }); }
    if (!fileInfo.type || !allowedTypes.includes(fileInfo.type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!fileInfo.data && fileInfo.type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }

    // Check parent id for file
    if (fileInfo.parentId) {
      const parentFile = await dbClient.fileCollection.findOne(
        {
          _id: ObjectId(fileInfo.parentId),
        },
      );
      // console.log(parentFile, fileInfo.parentId);
      if (!parentFile) { return res.status(400).json({ error: 'Parent not found' }); }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (fileInfo.type === 'folder') {
      // Add file and return the new file wth 201 status code
      const newFolder = await dbClient.fileCollection.insertOne({
        name: fileInfo.name,
        type: fileInfo.type,
        parentId: fileInfo.parentId ? ObjectId(fileInfo.parentId) : 0,
        isPublic: fileInfo.isPublic || false,
        userId: ObjectId(userId),
      });
      // console.log(newFolder.ops[0]);
      const result = {
        id: newFolder.insertedId,
        name: fileInfo.name,
        type: fileInfo.type,
        parentId: fileInfo.parentId || 0,
        isPublic: fileInfo.isPublic || false,
        userId,
      };
      // console.log(result);
      return res.status(201).json(result);
    }
    // file type image or file

    const dirPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath); }
    const fileName = `${uuidv4()}`;
    // const filePath = path.join(dirPath, fileName);
    // console.log(fileName);
    const filePath = `${dirPath}/${fileName}`;

    try {
      const fileData = Buffer.from(fileInfo.data, 'base64');
      fs.writeFileSync(filePath, fileData);
    } catch (error) {
      throw Error(error.message);
    }
    const newFile = await dbClient.fileCollection.insertOne({
      userId: ObjectId(userId),
      name: fileInfo.name,
      type: fileInfo.type,
      parentId: fileInfo.parentId ? ObjectId(fileInfo.parentId) : 0,
      isPublic: fileInfo.isPublic || false,
      localPath: filePath,
    });
    // const newFile = ;

    // console.log(result.ops[0]);
    // Temporary success message below
    const result = {
      id: newFile.insertedId,
      userId,
      name: fileInfo.name,
      type: fileInfo.type,
      parentId: fileInfo.parentId || 0,
      isPublic: fileInfo.isPublic || false,
    };
    return res.status(201).json(result);
  }

  static async getShow(req, res) {
    const { token } = req;
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) { return res.status(401).json({ error: 'Unauthorized' }); }
    // console.log(req.params.id);
    const file = await dbClient.fileCollection.findOne(
      // Use this for prodcution
      { _id: ObjectId(req.params.id), userId: ObjectId(userId) },
      // Use this for testing
      // { _id: ObjectId(req.params.id), userId },
    );
    if (!file) { return res.status(404).json({ error: 'Not found' }); }
    const result = {
      id: file._id,
      name: file.name,
      type: file.type,
      parentId: file.parentId,
      isPublic: file.isPublic,
      userId,
    };
    return res.status(200).json(result);
    // return res.status(200).json({ message: 'Success' });
  }

  static async getIndex(req, res) {
    const { token } = req;
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    // console.log(userId);
    const user = await dbClient.userCollection.findOne({ _id: ObjectId(userId) });
    if (!user) { return res.status(401).json({ error: 'Unauthorized' }); }

    const { parentId, page } = req.query;
    const pageInt = page > -1 ? parseInt(page, 10) : 0;

    let query;

    // Commented out for testing purpose, alternative should be used for production
    if (!parentId) {
      query = { userId: ObjectId(userId) };
    } else {
      query = { userId: ObjectId(userId), parentId: ObjectId(parentId) };
      // query = { userId, parentId };
    }
    const itemsPerPage = 20;

    const result = await dbClient.fileCollection.aggregate(
      [
        { $match: query },
        { $skip: pageInt * itemsPerPage },
        { $limit: itemsPerPage },
      ],
    ).toArray();
    const finalResult = result.map((file) => ({
      id: file._id,
      name: file.name,
      type: file.type,
      parentId: file.parentId,
      isPublic: file.isPublic,
      userId,
    }));
    return res.status(200).json(finalResult);
  }

  static async putPublish(req, res) {
    const { token } = req;
    const { id } = req.params;
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) { return res.status(401).json({ error: 'Unauthorized' }); }

    // *********** Use this for production: ***********
    let file = await dbClient.fileCollection.findOne(
      {
        _id: ObjectId(id),
        userId: ObjectId(userId),
      },
    );

    // *********** Use this for testing: ***********
    /*   let file = await dbClient.fileCollection.findOne(
        {
          _id: ObjectId(id),
          userId,
        },
      );
      console.log(file); */
    // // *********** *********** ***********
    if (!file) { return res.status(404).json({ error: 'Not found' }); }

    await dbClient.fileCollection.updateOne(
      { _id: ObjectId(id) },
      { $set: { isPublic: true } },
    );

    // Get updated value: note: this maybe expensive operation
    file = await dbClient.fileCollection.findOne(
      {
        _id: ObjectId(id),
        userId: ObjectId(userId),
      },
    );

    const result = {
      id: file._id,
      name: file.name,
      type: file.type,
      parentId: file.parentId,
      isPublic: file.isPublic,
      userId,
    };
    return res.status(200).json(result);
  }

  static async putUnpublish(req, res) {
    const { token } = req;
    const { id } = req.params;
    if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) { return res.status(401).json({ error: 'Unauthorized' }); }

    // *********** Use this for production: ***********
    let file = await dbClient.fileCollection.findOne(
      {
        _id: ObjectId(id),
        userId: ObjectId(userId),
      },
    );

    // *********** Use this for testing: ***********
    // let file = await dbClient.fileCollection.findOne(
    //   {
    //     _id: ObjectId(id),
    //     userId,
    //   },
    // );
    // console.log(file);
    // *********** *********** ***********
    if (!file) { return res.status(404).json({ error: 'Not found' }); }

    await dbClient.fileCollection.updateOne(
      { _id: ObjectId(id) },
      { $set: { isPublic: false } },
    );

    // Get updated value: note: this maybe expensive operation
    file = await dbClient.fileCollection.findOne(
      {
        _id: ObjectId(id),
        userId: ObjectId(userId),
      },
    );

    const result = {
      id: file._id,
      name: file.name,
      type: file.type,
      parentId: file.parentId,
      isPublic: file.isPublic,
      userId,
    };
    return res.status(200).json(result);
  }

  static async getFile(req, res) {
    const { id } = req.params;
    const { token } = req;
    // if (!token) { return res.status(401).json({ error: 'Unauthorized' }); }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    const user = await dbClient.userCollection.findOne({ _id: ObjectId(userId) });
    // if (!userId) { return res.status(401).json({ error: 'Unauthorized' }); }

    const file = await dbClient.fileCollection.findOne({ _id: ObjectId(id) });
    if (!file) { return res.status(404).json({ error: 'Not found' }); }
    // console.log(`typeof file.userId: ${typeof file.userId.toString()},\
    // typeof userId: ${typeof userId}`);
    if (!file.isPublic && (!user || file.userId.toString() !== user._id.toString())) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return res.status(400).json({ error: 'A folder doesn\'t have content' });
    }

    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    try {
      const mimeType = contentType(lookup(file.name));
      res.setHeader('Content-Type', mimeType);
      if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        const data = fs.readFileSync(file.localPath, 'utf-8');
        return res.status(200).send(data);
      }
      const data = fs.readFileSync(file.localPath);
      return res.status(200).send(data);
    } catch (error) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
export default FileController;
