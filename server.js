'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet')
const app = express();
const apiRoutes = require('./routes/api.js');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(process.cwd() + '/public'));
app.use('/img', express.static(process.cwd() + '/img'));




//Front-end
app.route('/cust_add/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/cust_add.html');
  });
app.route('/vehicle_add/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/vehicle_add.html');
  });
app.route('/rental_add/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/rental_add.html');
  });
app.route('/rental_return/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/rental_return.html');
  });
app.route('/search/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/search.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function(req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });




//Routing for API 
apiRoutes(app);

//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});


app.listen(3000, () => {
  console.log('server started');
});
