const multer = require("multer")
const multergooglestorage = require("multer-google-storage")
exports.uploadhandler = multer({
    storage : multergooglestorage.storageEngine({
      autoretry: true,
      bucket: "lucid_profile_pictures",
      projectId: "decoded-vision-419004",
      keyFilename : "credentials.json",
  
  
      filename: function(req, file, cb){
        cb(null, `${Date.now().toString()}.${file.mimetype.split("/")[1]}` )
  
    }
    })
  })

  