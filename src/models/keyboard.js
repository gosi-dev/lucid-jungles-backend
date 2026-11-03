
const { string, number } = require('joi');
const mongoose = require('mongoose');

const KeyboardSchema = new mongoose.Schema({
   id: {
       type: Number
   },
   url:{
       type: String
   },
   code: {
       type: String
   },
   glyph:{
       type: String
   }
})

exports.Keyboard = mongoose.model('keyboard', KeyboardSchema);
