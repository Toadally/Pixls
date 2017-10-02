(function() {
var socket = io.connect({secure: true});
var content =[];
var color = "none";
var cursorIn = false;
var cursorX = 0;
var cursorY = 0;
var canvas;
var $section = $('.viewport');
var $panzoom = $section.find('.panzoom').panzoom();

var users;
var name;

var slid = true;


socket.on('disconnect', function(){
  $(".lostConnection").fadeIn(750);
});

socket.on('connect', function(){
  $(".lostConnection").fadeOut(750);
});



$panzoom.parent().on('mousewheel.focal', function( e ) {
  e.preventDefault();
  var delta = e.delta || e.originalEvent.wheelDelta;
  var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
  $panzoom.panzoom('zoom', zoomOut, {
    increment: 0.1,
    animate: false,
    focal: e,
    which: -1
  });
});



socket.on("user", function(change){

  users = change;
  $("#userCt").html(users);

});

var width = 1000;
var height = 1000;
function drawPixel(context,x,y,color){

  context.fillStyle = color;
  context.fillRect(x, y, 1, 1);



}
function render(context) {
  context.beginPath();
  context.clearRect(0, 0, canvas.width, canvas.height);
  for(var i = 0; i < content.length; i++){
    var x = content[i];
    var p = x.split(";");
    drawPixel(context,p[0],p[1],p[2]);
  }

  if(cursorIn){
    drawPixel(context,cursorX,cursorY,color);
  }
};

$(document).ready(function(){
  socket.emit("update");
  canvas = document.getElementById('canvas');
	var context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  canvas.width = width;
	canvas.height = height;


  var start;
  var end;

  function chatSlide(){
    if(slid){

      var height = $(".chatbox").height() * (-1);
      console.log(height);
      $(".chatbox").animate({
        "bottom":height+"px"
      }, 250);
    } else {
      $(".chatbox").animate({
        "bottom":"0px"
      }, 250);
    }
  }
  chatSlide();
  $("#chatselect").click(function(){
    if(slid){

      $(this).attr("class","fa fa-minus");
      slid = false;
      chatSlide();

    } else {
      $(this).attr("class","fa fa-plus");
      slid = true;
      chatSlide();
    }

  });

  $("#canvas").dblclick(function(e){

      if(color != "none"){
        var cm = new CanvasMouse(context, {
          handleScale: true,
          handleTransforms: true
        });
        var pos = cm.getPos(e);

        var x = Math.floor(pos.x);
        var y = Math.floor(pos.y);

        askClick(x,y);

      }
	});
  var msX = -1;
  var mxY = -1;

  $("#canvas").on("mousemove", function(e){
    cursorIn = true;
    if(color != "none"){
      cursorIn = true;
      /*var rect = canvas.getBoundingClientRect();
      msX= Math.floor((e.clientX-rect.left)/(rect.right-rect.left)*canvas.width);
      msY = Math.floor((e.clientY-rect.top)/(rect.bottom-rect.top)*canvas.height);*/

      /*var pos = e;//getMousePos(canvas, e);          // get adjusted coordinates as above
      var matrix = context.currentTransform;
      var imatrix = matrix.inverse();            // get inverted matrix somehow
      pos = imatrix.applyToPoint(pos.x, pos.y);*/
      var cm = new CanvasMouse(context, {
        handleScale: true,
        handleTransforms: true
      });
      var pos = cm.getPos(e);




      cursorX = Math.floor(pos.x);
      cursorY = Math.floor(pos.y);

      render(context);



    } else {
    }


  });

  $(".palette div").click(function(){


    if($(this).hasClass("active")){
      $(this).removeClass("active");
      color = "none";
      var audio = new Audio('/public/sound/pallete.wav');
      audio.play();
      $("canvas").css("cursor","default");
      cursorX = -1;
      cursorY = -1;
      render(context);
    } else {
    color = $(this).css("background-color");
    $(this).siblings().removeClass("active");
    $(this).addClass("active");

    $("canvas").css("cursor","none");
    var audio = new Audio('/public/sound/unpallete.wav');
    audio.play();
  }
  });
  socket.on('sendDraw', function(xL, yL, colorL){
    canvas.width = width;
  	canvas.height = height;

    content.push(xL+";"+yL+";"+colorL);
    render(context);
    console.log("Hey");
  });
  socket.on("initt", function(d, ct){

    content = d;
    render(context);

    if(ct != 0){

      countdown(ct);

    }
  });

  function pixel(xl,yl){
    drawPixel(context,xl,yl,color);

    var data = context.getImageData(0, 0, canvas.width, canvas.height);

    socket.emit('draw', xl, yl, color);

    content.push(xl+";"+yl+";"+color);
    render(context);
    var audio = new Audio('/public/sound/pixel.wav');
    audio.play();
  }


  $(".setname").click(function(){
    checkName();
  });

  $(".chatbox .addName input").on('keyup', function (e) {
      if (e.keyCode == 13) {
          checkName();
      }
  });

  function checkName(){
    var $n = $(".chatbox .addName input").val()
    if(!$n.trim($(".setname").value).length) {
      return;
       }
    socket.emit("checkName", $n);
  }

  socket.on("confirmName", function(c, msg, id){
    if(c){
      $(".addName").css({

        "display":"none"
      });
      $(".chat").css("display","block");
      $(".feed").css("display","block");

      name = id;
      $(".chat-label").html("Chat ("+name+")");

    } else {

      $(".error").html(msg);

    }
  });
  $(".chatInput").on('keyup', function (e) {
      if (e.keyCode == 13) {
          sendChat();
      }
  });
  $(".sendchat").click(function(){ sendChat()});

  function sendChat(){
    if($(".chatInput").val().trim() != ""){
        socket.emit("sendChat", name, $(".chatInput").val().trim());
    }

  }

  socket.on("receiveChat", function(msg, u){
    if(name == u){
      $(".chatInput").val("");
    }
    $(".feed").find("table").append("<tr><td><b>"+u+"</b>: "+htmlEncode(msg)+"</td></tr>");
    $('.feed').animate({
    scrollTop: $('.feed').get(0).scrollHeight}, 250);
  });

  function htmlEncode(s)
  {
    var el = document.createElement("div");
    el.innerText = el.textContent = s;
    s = el.innerHTML;
    return s;
  }

  function askClick(xl, yl){
    console.log(xl + " " + yl);
    var currentDate = new Date();
    socket.emit("askClick", currentDate.getTime(), xl, yl);
  }
  socket.on("clickResult", function(success, xl, yl, time){

    if(success){
      pixel(xl,yl);
      countdown(3);
    } else {

    }

  });

});

function countdown(ct){

  $(".timeBox").css("display","block");
  $("#time").html("0:0"+ct);
  var counts = ct-1;
  var ctd = setInterval(function(){
    if(counts <= 0){

      $(".timeBox").css("display","none");
      clearInterval(ctd);

    } else {
      $("#time").html("0:0"+counts);

      counts--;
    }

  }, 1000);


}

})();
