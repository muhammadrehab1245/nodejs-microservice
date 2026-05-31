const Joi = require("joi");

const validateCommentOnPost = (data) => {
  const schema = Joi.object({
    text: Joi.string().min(1).max(500).required(),
  });

  return schema.validate(data);
};

module.exports = { validateCommentOnPost };