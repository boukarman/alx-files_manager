import { createClient } from 'redis';
import { promisify } from 'util';

class RedisClient {
  constructor() {
    this.client = createClient();

    this.client.on('error', (error) => {
      console.error('Redis client error:', error.message);
    });
    this.client.getAsync = promisify(this.client.get).bind(this.client);
    this.client.setAsync = promisify(this.client.setex).bind(this.client);
    this.client.delAsync = promisify(this.client.del).bind(this.client);
  }

  isAlive() {
    return this.client.connected;
  }

  async get(key) {
    return this.client.getAsync(key);
  }

  async set(key, value, duration) {
    return this.client.setAsync(key, duration, value);
  }

  async del(key) {
    return this.client.delAsync(key);
  }
}
const redisClient = new RedisClient();
module.exports = redisClient;
