
const mongoose = require('mongoose');

const maskSchema = new mongoose.Schema({
    name:{
        type: String
    },
   rewards:[
       
   ]
       
      
   

})

exports.Mask = mongoose.model('mask', maskSchema);