const express = require("express");
const socket = require("socket.io");
const app = express();

let server = app.listen(4000, function() {
    console.log("Server is running");
});

app.use(express.static("public"));

//t0 upgdrade server 
let io = socket(server);

io.on("connection", function(socket) {
    console.log("User connected :" + socket.id);

    socket.on("join", function(roomName) {
       
        //will give the list or map of the list of websocket connections
        let rooms = io.sockets.adapter.rooms;
        //check if there is a connection with the room name to the client
        let room = rooms.get(roomName); 

        if(room==undefined)
        {
            socket.join(roomName);
            socket.emit("created");
        }

        else if(room.size == 1)
        {
            socket.join(roomName);
            socket.emit("joined");
        }
        else 
        {
            socket.emit("full");
        }
        // console.log(rooms);           
    });

    //every time our server get a ready event, it broadcast that event to the other peer in the room
    socket.on("ready", function(roomName) {
        // console.log("Ready");
        socket.broadcast.to(roomName).emit("ready");
    });

    //along with READY event server also need ICE candidate(STUN) to share each others to know public address
    socket.on("candidate", function(candidate, roomName) {
        // console.log("candidate");
        socket.broadcast.to(roomName).emit("candidate", candidate);
    });

    //create offer SDP
    socket.on("offer", function(offer, roomName) {
        // console.log("offer");
        socket.broadcast.to(roomName).emit("offer", offer);
    });

    //create answer SDP
    socket.on("answer", function(answer, roomName) {
        // console.log("answer") ;
        socket.broadcast.to(roomName).emit("answer", answer);
    }); 

    socket.on("leave", function(roomName) {
        socket.leave(roomName);
        socket.broadcast.to(roomName).emit("leave");
    });

    socket.on("sendingMessage", function(data) {
        io.emit("broadcastMessage", data);
    });

});