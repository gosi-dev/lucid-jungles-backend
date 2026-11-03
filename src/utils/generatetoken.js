const shortid = require('shortid')
const {v4 : uuidv4} = require('uuid')

module.exports = ()=>{
    const newId = uuidv4()
    return newId
}


