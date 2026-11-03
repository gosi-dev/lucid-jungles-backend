const mongoose = require('mongoose');

// Message — chat / direct message (DATA_MODEL.md: Message)
const messageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  threadId:   { type: String, required: true },
  content:    { type: String, required: true },
  read:       { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ threadId: 1, createdAt: 1 });
messageSchema.index({ senderId: 1, receiverId: 1 });

exports.Message = mongoose.model('Message', messageSchema);
