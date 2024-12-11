import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';
    this.url = `mongodb://${this.host}:${this.port}`;
    this.client = new MongoClient(this.url, { useUnifiedTopology: true });
    this.isConnected = false;

    this.db = null;
    this.userCollection = null;
    this.filesCollection = null;

    this.makeConnection();
  }

  async makeConnection() {
    try {
      await this.client.connect();
      this.isConnected = true;

      this.db = this.client.db(this.database);
      this.fileCollection = this.db.collection('files');
      this.userCollection = this.db.collection('users');
    } catch (error) {
      console.log(error.message);
      this.isConnected = false;
    }
  }

  isAlive() {
    return this.isConnected;
  }

  async nbUsers() {
    try {
      const users = await this.userCollection.countDocuments();
      return users;
    } catch (error) {
      console.log(error.message);
      return null;
    }
  }

  async nbFiles() {
    try {
      const files = await this.fileCollection.countDocuments();
      return files;
    } catch (error) {
      console.log(error.message);
      return null;
    }
  }
}
const dbClient = new DBClient();
module.exports = dbClient;
