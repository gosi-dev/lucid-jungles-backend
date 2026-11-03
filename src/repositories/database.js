const { connect } = require('mongoose');

const dbUrl = process.env.DATABASE_URL;

(async function () {
  try {
    const connected = await connect(dbUrl);
    console.log('DB Connected');
  } catch (error) {
    console.log('DB Error', error);
  }
})();
