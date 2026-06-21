async function invalidatePostFeedbackCache(redisClient, postId) {
  const commentKeys = await redisClient.keys(`comments:${postId}:*`);
  const likeKeys = await redisClient.keys(`likes:${postId}:*`);
  const allKeys = [...commentKeys, ...likeKeys];

  if (allKeys.length > 0) {
    await redisClient.del(...allKeys);
  }
}

module.exports = { invalidatePostFeedbackCache };
