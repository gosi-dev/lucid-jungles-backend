const dotenv = require('dotenv').config()
const aws = require('aws-sdk/clients/s3')
const { spawnSync } = require('child_process')
const fs = require('fs.promises')
const bucketname = process.env.AWS_BUCKET_NAME
const region = process.env.AWS_BUCKET_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY_ID
const secretAccessKey = process.env.AWS_SECRET_KEY
const path = require('path')
const s3 = new aws({
    region,
    accessKeyId,
    secretAccessKey
})

exports.upload = async (file,userid,type) =>{
    
    
    await fs.writeFile(`${userid}.${type}`, file, 'base64',(err)=>{
        
    })
    
    
    
    const filestream = await  fs.readFile(`${userid}.${type}`)
   
      
    const uploadparams = {
        Bucket: bucketname,
        Body: filestream,
        Key: `${userid}.${type}`,
        ACL: 'public-read',   
    }
   const result =  s3.upload(uploadparams).promise()
    
    await fs.unlink(`${userid}.${type}`, err=> console.log(err))
    return result
    
}