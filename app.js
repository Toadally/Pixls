var express = require("express");
var app = express();
var server = require('http').Server(app);
var http = require('http');
var fs = require("fs");
var ejs = require("ejs");
var HashMap = require('hashmap');
var socketPort = 7888;
var webPort = 7777;
var session = require('express-session')

session = require("express-session")({
    secret: "my-secret",
    resave: true,
    saveUninitialized: true
  }),
  sharedsession = require("express-socket.io-session");
app.use(session);

server.listen(socketPort);

var io = require("socket.io")(server);

app.set("view engine", "ejs");

app.use("/public", express.static("public"));

app.get("/", function(req, res){
  res.sendFile(__dirname + "/views/index.html");
});

var connections = [];
var cachedMap = JSON.parse(fs.readFileSync('store.json', 'utf8'));

var users = new HashMap();
var dates = new HashMap();
var namesTaken = [];


var clients = 0;
// Add a connect listener
io.on('connection', function(socket) {
  var address = socket.handshake.address;

    clients++;
    console.log('Client connected.');
    console.log("Currently online: "+clients);

    socket.on("update", function(){
      var counts = 0;
      if(dates.has(address)){


        var currentDate = new Date().getTime();
        counts = Math.ceil((dates.get(address)-currentDate)*2/1000);
        if(counts <= 0){
          counts = 0;
        }
      }

      socket.emit("initt", cachedMap, counts);

      io.sockets.emit("user",clients);

    });
    // Disconnect listener
    socket.on('disconnect', function() {
        console.log('Client disconnected.');
        clients--;
        console.log("Currently online: "+clients);

        io.sockets.emit("user",clients);

        if(users.has(socket)){
          var chat = users.get(socket);
          users.delete(socket);

          namesTaken.splice(namesTaken.indexOf(chat));
        }

    });
    //Receive Pixel Listener
    socket.on('draw', function(x, y, color, data){
        replaceIfExists(x,y,color);
        io.sockets.emit("sendDraw", x, y, color);
    });

    socket.on("checkName", function(val){
      console.log(namesTaken);

      var processVal = val.toLowerCase();

      var disallowedChars = "Only alphanumeric characters and underscores allowed.";
      var nameTaken = "That name is currently taken."
      var cont = true;
      var allowed = "abcdefghijklmnopqrstuvwxyz_1234567890";
      console.log(val);
      for(var i = 0; i < processVal.length; i++){

        if(!(allowed.includes(processVal.charAt(i))) || val.trim()==""){

          socket.emit("confirmName", false, disallowedChars, "");
          cont = false;
          console.log(disallowedChars);
          break;
        }
      }

      if(cont){
        if(namesTaken.includes(val)){

          socket.emit("confirmName", false, nameTaken, "");
          console.log(nameTaken);
          cont = false;

        } else {
          console.log("name added");
          namesTaken.push(val);
          users.set(socket, val);
          socket.emit("confirmName", true, "", val);
        }
      }






    });

    socket.on("sendChat", function(name, msg){

      io.sockets.emit("receiveChat", msg, name);

    });

    socket.on("askClick", function(currentDate, x, y){

      var itime = 3;

      var time = itime/2*1000;

      console.log("Current date: "+currentDate);
      if(!(dates.has(address))) {
        dates.set(address, currentDate+time, itime);
        console.log("Stored date: "+dates.get(address));
        socket.emit("clickResult", true, x, y);
      } else {
        var next = dates.get(address);
        if(Math.abs(next-currentDate) >= time){
          dates.delete(address);
          dates.set(address, currentDate+time);
          socket.emit("clickResult", true, x, y, itime);
          console.log("Stored date: "+dates.get(address));

        } else {
          console.log("Current date: "+currentDate);
          var next = dates.get(address);
          console.log("Difference: "+ (next-currentDate) );
          socket.emit("clickResult", false, x, y, itime);

        }


      }


    });
});
function replaceIfExists(x, y, color){

  for(var i = 0; i < cachedMap.length; i++){
    var cut = cachedMap[i].split(";");


    if ( x==cut[0] && y==cut[1]){

      cachedMap.splice(i,1);
      cachedMap.push(x+";"+y+";"+color);

      fs.writeFile('store.json',JSON.stringify(cachedMap),(data)=>{
        //console.log('done');
      });
    }


  }
  cachedMap.push(x+";"+y+";"+color);
  fs.writeFile('store.json',JSON.stringify(cachedMap),(data)=>{

  });


}
io.use(sharedsession(session));
app.listen();
console.log("NODE.JS > Listening on "+webPort);
console.log("CANVAS > Listening on "+socketPort);
