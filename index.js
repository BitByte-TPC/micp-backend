const mongoose = require('mongoose');
const app = require('./app');
const { MONGO_DATABASE_DEV } = require('./config');

mongoose.set('strictQuery', true);
// db
mongoose.connect(MONGO_DATABASE_DEV, {
  useNewUrlParser: true, useUnifiedTopology: true,
}).then(() => console.log('DB Connected...')).catch((err) => console.error(err));

const port = process.env.PORT || 8000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
