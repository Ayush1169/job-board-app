require("dotenv").config()
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var methodOverride = require('method-override')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

const session = require('express-session')
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'))
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session ({
  secret:  process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}))

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user;
  next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render("error", { message: err.message, error: err});
});

const mongoose = require('mongoose');


mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('MongoDB connected');
  const PORT = process.env.PORT ;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
})
.catch((err) => console.error('MongoDB connection error:', err));




module.exports = app
