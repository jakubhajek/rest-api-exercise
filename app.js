const express = require('express');
const app = express();
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config({ path: '/run/api/.env'});

// import routes
const titanicRoute = require('./src/routes/titanic');
const healthz = require('./src/routes/healthz');

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use('/people', titanicRoute);
app.use('/healthz', healthz);

app.get('/', (req, res) => {
  const welcome = {
    uptime: process.uptime(),
    message: 'this is Titanic API, welcome on board!'
  }
  try {
    res.status(200).send(welcome);
  } catch (err) {
    welcome.message = err;
    res.status(503).send()

  }
}
);

// connect to db
mongoose.connect(process.env.DB_URI, {
  dbName: process.env.DB_NAME,
  user: process.env.DB_USER,
  pass: process.env.DB_PASSWORD,
  useUnifiedTopology: true,
  useNewUrlParser: true
}).
  then(() => {
    console.log('Connected to Mongo');
  })
  .catch(error => console.error(error.message));
/*
mongoose.connect(
  process.env.DB_CONNECTION,
  { useNewUrlParser: true },
  () => console.log('Connected to Db')
);
*/
//Listen
app.listen(3000);
