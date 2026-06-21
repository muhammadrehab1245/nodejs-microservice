async function invalidateSearchCache(redisClient) {
  const keys = await redisClient.keys("search:*");
  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
}

module.exports = { invalidateSearchCache };
