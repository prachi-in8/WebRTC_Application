// let socket = io.connect("http://localhost:4000");
let socket = io.connect("http://localhost:4000");
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");  

let divButtonGroup = document.getElementById("btn-group");  
let hideCameraButton = document.getElementById("hideCameraButton");  
let muteButton = document.getElementById("muteButton");  
let leaveRoomButton = document.getElementById("leaveRoomButton");  


var message = document.getElementById("message");
var sendButton = document.getElementById("send");
var username = document.getElementById("username");
var output = document.getElementById("output");

let muteFlag = false;
let hideCamera = false;

let roomName;
let creater = false;
let rtcPeerConnection;
let userStream;

//creating dictonary which has a key iceServers and then it has a list of stun servers
let iceServers = {
    iceServers:[
        {urls: "stun:stun.services.mozilla.com"},
        {urls: "stun:stun1.l.google.com:19302" },

    ],
};

joinButton.addEventListener("click", function () {

    if (roomInput.value == "") {
        alert("Please enter a room name");
    } else {
        roomName = roomInput.value;
        socket.emit("join", roomName);
    }
});


sendButton.addEventListener("click", function() {
    socket.emit("sendingMessage", {
        message: message.value,
        username: username.value,
    }); 
})

hideCameraButton.addEventListener('click', function() {

    hideCamera = !hideCamera;
    if(hideCamera)
    {
        userStream.getTracks()[1].enabled = false;
        hideCameraButton.textContent = "Turn On Camera";
    }
    else
    {
        userStream.getTracks()[1].enabled = true;
        hideCameraButton.textContent = "Turn Off Camera";
    }
});

muteButton.addEventListener("click", function () {

    muteFlag = !muteFlag;
    if (muteFlag) {
        userStream.getTracks()[0].enabled = false;
        muteButton.textContent = "Unmute";
    } else {
        userStream.getTracks()[0].enabled = true;
        muteButton.textContent = "Mute";
    }
});

leaveRoomButton.addEventListener("click", function () {

    socket.emit("leave", roomName); //Let's the server know that user has left the room.

    divVideoChatLobby.style = "display:block"; //Brings back the Lobby UI
    divButtonGroup.style = "display:none";

    if (userVideo.srcObject) {
        userVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of User.
        userVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of User
    }
    if (peerVideo.srcObject) {
        peerVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of Peer.
        peerVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of Peer.
    }

    //Checks if there is peer on the other side and safely closes the existing connection established with the peer.
    if (rtcPeerConnection) {
        rtcPeerConnection.ontrack = null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection = null;
    }
});

socket.on("created", function() {
    creater=true;
    //constraints

    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 500, height: 400 },
    })
    //success function has the stream variable and set srcObject to that stream and everytime  stream is loaded, it will play
    .then(function(stream) {
    /* use the stream */
        userStream = stream;
        divVideoChatLobby.style = "display:none";
        divButtonGroup.style = "display:flex";
        userVideo.srcObject = stream;
        userVideo.onloadedmetadata = function(e) {
            userVideo.play();
        };
    })
    //error function
    .catch(function(err) {
    /* handle the error */
        alert("Couldn't access user media");
    });
});

socket.on("joined", function() {
    creater=false;
    //constraints
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: 500, height: 400 },
    })
    //success function has the stream variable and set srcObject to that stream and everytime  stream is loaded, it will play
    .then(function(stream) {
    /* use the stream */
        userStream = stream;
        divVideoChatLobby.style = "display:none";
        divButtonGroup.style = "display:flex";
        sendButton.style = "display:block";
        userVideo.srcObject = stream;
        userVideo.onloadedmetadata = function(e) {
            userVideo.play();
        };
        socket.emit("ready", roomName);
    })
    
    //error function
    .catch(function(err) {
    /* handle the error */
        alert("Couldn't Access User Media");
    });
});

socket.on("full" , function() {
    alert("Room is Full! Can't Join.")
});

socket.on("ready", function() {
    if(creater){
        //establish peer connection though rtc peer connection
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        //onIceCandidate--->triggered when it will have candidate in the iceserver
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction; 
        //implement on track function--->triggered when we start to get media streams from peer to whcih we are trying to communicate
        rtcPeerConnection.ontrack = onTrackFunction; 

        // console.log(userStream.getTracks());
        
        //send media stream of senders also to the other peer
        //get track return audio as well video
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);

        //create offer SDP
        // rtcPeerConnection.createOffer(
        rtcPeerConnection
        .createOffer()
        .then((offer) => {
            rtcPeerConnection.setLocalDescription(offer);
            socket.emit("offer", offer, roomName);
        })

        .catch((error) => {
            console.log(error);
        });
    }
});

socket.on("candidate", function(candidate) {
    let icecandidate = new RTCIceCandidate(candidate);
    rtcPeerConnection.addIceCandidate(icecandidate);
});

socket.on("offer", function(offer) {
    if(!creater){
        //establish peer connection though rtc peer connection
        rtcPeerConnection = new RTCPeerConnection(iceServers);
        //onIceCandidate--->triggered when it will have candidate in the iceserver
        rtcPeerConnection.onicecandidate = OnIceCandidateFunction; 
        //implement on track function--->triggered when we start to get media streams from peer to whcih we are trying to communicate
        rtcPeerConnection.ontrack = onTrackFunction;  
        //send media stream of senders also to the other peer
        //get track return audio as well video
        rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
        rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
        rtcPeerConnection.setRemoteDescription(offer);

        //create offer SDP
        // rtcPeerConnection.createAnswer(
        rtcPeerConnection
        .createAnswer()
        .then((answer) => {
            rtcPeerConnection.setLocalDescription(answer);
            socket.emit("answer", answer, roomName);
        })
        .catch((error) => {
            console.log(error);
        });
    }
});

socket.on("answer", function(answer) {
    rtcPeerConnection.setRemoteDescription(answer);
});

socket.on("broadcastMessage", function(data) {
    output.innerHTML += 
    "<p><strong>" + data.username + ": </strong>" + data.message + "</p>";
});

socket.on("leave", function() {

    creater=true;
    if(rtcPeerConnection)
    {
        rtcPeerConnection.ontrack=null;
        rtcPeerConnection.onicecandidate = null;
        rtcPeerConnection.close();
        rtcPeerConnection=null;
    }
    if(peerVideo.srcObject)
    {
        peerVideo.srcObject.getTracks()[0].stop();
        peerVideo.srcObject.getTracks()[1].stop();
    }
    
});


function OnIceCandidateFunction(event) {

    // console.log("Candidate");
    //if there is a candidate in that event we will emit
    if(event.candidate) {
        socket.emit("candidate", event.candidate, roomName);
    }
}

function onTrackFunction(event){
    peerVideo.srcObject = event.streams[0];
    peerVideo.onloadedmetadata = function(e) {
        peerVideo.play();
    };
}