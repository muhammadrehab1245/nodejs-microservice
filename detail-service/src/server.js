require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./utils/logger");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitmq");
const {
  handlePostCreated,
  handlePostDeleted,
  handleFeedbackAdded,
  handleFeedbackRemoved,
} = require("./eventHandlers/detail-event-handlers");
const detailRoutes = require("./routes/detail-routes");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const app = express();
const PORT = process.env.PORT || 3005;

//connect to mongodb
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => logger.info("Connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error", e));

const redisClient = new Redis(process.env.REDIS_URL);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use(
  "/api/detail",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  sensitiveEndpointsLimiter,
  detailRoutes,
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();

    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);
    await consumeEvent("feedback.added", handleFeedbackAdded);
    await consumeEvent("feedback.removed", handleFeedbackRemoved);

    app.listen(PORT, () => {
      logger.info(`Detail service is running on port: ${PORT}`);
    });
  } catch (e) {
    logger.error(e, "Failed to start detail service");
    process.exit(1);
  }
}

startServer();
