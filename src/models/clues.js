
const mongoose = require('mongoose');

const clueSchema = new mongoose.Schema({
    name:{
        type: "String"
    },
    
    clues:[]


})

exports.Clues = mongoose.model('clues', clueSchema);