const multer = require('multer');
const multers3 = require('multer-s3');
const S3Client = require('aws-sdk/clients/s3');

const accessKeyId = process.env.AWS_ACCESS_KEY_ID || 'xxxxxx'; //intentionally throw error
const secretAccessKey =
  process.env.AWS_SECRET_ACCESS_KEY || '+xxxxxx+B+xxxxxxx';

const S3 = new S3Client({
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
});

const s3Bucket = 'lucidjungles/Assets/Avatars';

exports.uploadAvatar = multer({
  storage: multers3({
    s3: S3,
    bucket: s3Bucket,
    acl: 'public-read',
    metadata: function (req, file, cb) {
      //The meta object to be sent to S3
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      //the name of the file
      let oldName = file.originalname.split('.')
        ? file.originalname.split('.')[0]
        : file.originalname;
      req.fileName = oldName + Date.now().toString() + '.png';
      cb(null, req.fileName);
    },
  }),
}).single('file');
