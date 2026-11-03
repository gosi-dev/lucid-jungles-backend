const mongoose = require('mongoose');

// Post — feed post (DATA_MODEL.md: Post)
const postSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  communityId: { type: mongoose.Schema.Types.ObjectId, ref: 'fanbase' },
  content:     { type: String },
  type:        { type: String, enum: ['status', 'image', 'video', 'link'], default: 'status' },
  mediaUrl:    { type: String },
  reactions:   [{ type: String }],
}, { timestamps: true });

postSchema.index({ createdAt: -1 });
postSchema.index({ communityId: 1, createdAt: -1 });

exports.Post = mongoose.model('Post', postSchema);
