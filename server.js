const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')
const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, function(err) {
  if (err) { 
    console.log(err);
    } else {
    console.log("connected to db!")
  }
});


app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//Serve up HTML and CSS files
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Create Schema and Model for Users
var Schema = mongoose.Schema;

var userSchema = new Schema({
  username: {type: String, default: "", required: true},
  shortid: {type: String, unique: true, default: shortid.generate},
  exercise: [{
    description: String,
    duration: Number,
    date: Date
  }]
});

var User = mongoose.model('User', userSchema);

//Handle posting username
app.post("/api/exercise/new-user", (req, res) => {
  User.findOne({username: req.body.username}, function(err, data){
    if(err){console.log(err);}
    else if (data !== null){res.send("Username already taken");}
    else {
      let user = new User({username: req.body.username});
      user.save((err, data)=>{
        if(err){console.log(err);}
        else{
          User.findOne({username: req.body.username}, function(err, data){
            if(err){console.log(err);}
            else {res.json({username: data.username, id: data.shortid});}
          });
        }
      });
    }
  });
});

//Handle posting exercises
app.post("/api/exercise/add", (req, res)=>{
  User.findOne({shortid: req.body.userId}, function(err, data){
    let checkDate = new Date(req.body.date);
    if(err){console.log(err);}
    else if(data == null){res.send("User does not exist");} 
    else if(checkDate == "Invalid Date"){res.send("Invalid date");}
    else{
      data.exercise.push({
        description: req.body.description,
        duration: req.body.duration,
        date: new Date(req.body.date)
      });    
      data.save((err,data)=>(err?console.log(err):console.log(data)));
      res.json({Username: data.username, description: req.body.description, duration: req.body.duration, date: req.body.date});
    } 
  });
});

//Handle request for data
app.get("/api/exercise/log",function(req, res){
  
  // /api/exercise/log?{userId}[&from][&to][&limit]
  // example: /api/exercise/log?userId=SGZ5FXCix&from=2019-07-13&to=2019-07-15&limit=0
  let userId = req.query.userId;
  let limit = parseInt(req.query.limit, 10);
  let start = new Date(req.query.from);
  let end = new Date(req.query.to); 
  
  console.log("UserId: "+userId+"from: "+start+"to: "+end+"limit: "+limit);
  
  if (start == "Invalid Date" || end == "Invalid Date"){
    User.findOne({shortid: userId}, (err, data)=>{
      if(err){res.send("Invalid date")}
      else{
        res.send("Invalid date range. Sending full log: " + data);
      }
    });
  } else{
    User.findOne({shortid: userId}, (err, data)=>{
      if(err){res.send("There was an error");}
      else if (data == null){res.send("User does not exist");}
      else{
        let result = data.exercise.filter((d)=>{
          if(d.date < start || d.date>end){
            return false
          }else{
            return true;
          }
        });
        if (!limit){ res.send(result);}
        else{
          let limResult = result.slice(0,limit);
          res.send(limResult);
        }
      }
    });
  }
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
