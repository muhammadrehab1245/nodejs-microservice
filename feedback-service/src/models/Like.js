const mongoose = require("mongoose");

const likeSchema = new mongoose.Schema(
  {
    postId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

likeSchema.index({ postId: 1, userId: 1 }, { unique: true });

const Like = mongoose.model("Like", likeSchema);

module.exports = Like;