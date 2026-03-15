require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const result = await mongoose.connection.collection('hospitals').updateMany(
    {},
    { $set: { status: 'online', lastHeartbeat: new Date() } }
  );
  console.log('✅ Fixed hospitals:', result.modifiedCount);
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
