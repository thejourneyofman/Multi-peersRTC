$( document ).ready(function() {

    var isRoomInitiated = false;
    var isStartedWith = {};
    var isOfferedFrom = {};
    var localStream = null;
    var hostId;
    var sessionId;
    var remoteVideos = {};
    var remoteStreams = {};
    var peerConns = {};

    const startButton = document.getElementById('startButton');
    const callButton = document.getElementById('callButton');
    const cameraButton = document.getElementById('cameraButton');
    const hangupButton = document.getElementById('hangupButton');
    const muteButton = document.getElementById('muteButton');
    const messageBox = document.getElementById('messageBox');
    callButton.style.visibility = 'hidden';
    cameraButton.disabled = true;
    cameraButton.className = "fas fa-video-slash";
    cameraButton.style['pointer-events'] = 'none';
    cameraButton.title = "turn off camera";
    muteButton.disabled = true;
    muteButton.className = "fas fa-microphone-slash";
    muteButton.style['pointer-events'] = 'none';
    muteButton.title = "turn off microphone";
    hangupButton.style.background  = 'grey';
    hangupButton.style['pointer-events'] = 'none';
    hangupButton.disabled = true;
    startButton.onclick = start;
    callButton.onclick = call;
    cameraButton.onclick = switchCamera;
    hangupButton.onclick = hangup;
    muteButton.onclick = muteMicrophone;

    /////////////////////////////////////////////
    var socket=io.connect(window.location.protocol+'//'+window.location.hostname+(location.port ? ':'+location.port: ''));
    socket.on('connect', function(){
       sessionId = socket.io.engine.id;
       console.log("Session id", sessionId);
    });

    var room = prompt('Enter room name:');
    socket.emit('created or joined', room);

    socket.on('created or joined', function(res) {
      if (res.room !== room) {
        return false;
      }
      console.log(" Created or joined room ", res.sid);
      if (res.peers[room].host === res.sid) {
         messageBox.value += 'You are the host of the room: ' + room + '.\n';
         hostId = res.sid;
      } else {
        messageBox.value += res.sid + ' has joind the room: ' + room + '.\n';
      }
      messageBox.scrollTop = messageBox.scrollHeight;
      if (res.peers[room].isActive)
         isRoomInitiated = true;
      res.peers[room].members.forEach(function(entry) {
         if (entry !== sessionId) {
            peerConns[entry] = null;
            isStartedWith[entry] = false;
            isOfferedFrom[entry] = false;
            if (entry === res.peers[room].host) {
              hostId = entry;
            }
         }
      });
      console.log("Peer Connns ",peerConns, "room", res.room);
    });

    socket.on('created error', function(res) {
      if (res.room !== room) {
        return false;
      }
      if (res.sid === sessionId) {
        alert(res.err);
        room = prompt('Enter room name:');
        socket.emit('created or joined', room);
      }
    });

    socket.on('closed', function(res) {
      if (res.room !== room) {
        return false;
      }
      messageBox.value += 'The room is closed and down: ' + res.room + '\n';
      console.log("Peer Connns ",peerConns, "room", res.room)
      handleRemoteHangup();
    });
    ////////////////////////////////////////////////

    function sendMessage(message) {
      console.log('Client sending message: ', message);
      socket.emit('message', message);
    }

    socket.on('message', function(message) {
      console.log('Client received message:', message);
      if (message.room!= null && message.room!= room) {
         return false;
      }
      if (message.to!= null && message.to !==sessionId) {
         return false;
      }
      if (message.content.type === 'got user media') {
         if (message.from === hostId) {
           isRoomInitiated = true;
           messageBox.value += 'The room is opened and up: ' + room + '\n';
           isOfferedFrom[message.from] =true;
         }
         if (isRoomInitiated) {
           maybeStart(message.from);
         }
      } else if (message.content.type === 'offer') {
         callButton.style.visibility = 'visible';
         if (isOfferedFrom[message.from] && message.from !==hostId) {
            peerConns[message.from].setRemoteDescription(new RTCSessionDescription(message.content));
            doAnswer(message.from);
            isStartedWith[message.from] = true;
            callButton.innerHTML = "Talking";
         } else {
            isOfferedFrom[message.from] = true;
            maybeStart(message.from);
            callButton.innerHTML = "Answer";
            peerConns[message.from].setRemoteDescription(new RTCSessionDescription(message.content));
         }
      } else if (message.content.type === 'answer' && !isStartedWith[message.from]) {
          try {
            peerConns[message.from].setRemoteDescription(new RTCSessionDescription(message.content));
            callButton.style.visibility = 'visible';
            callButton.disabled = true;
            callButton.innerHTML = "Talking";
            isStartedWith[message.from] = true;
            messageBox.value += message.from + ' has joined the room: ' + room + '(Status: Talking...)\n';
            sendMessage({'room':room, 'from':sessionId, 'to':message.from, 'content': {type: 'responsed'}});
          } catch (e) {
            console.log("answer exception", e);
          }
      } else if (message.content.type === 'candidate' && isStartedWith[message.from]) {
          var candidate = new RTCIceCandidate({
            sdpMLineIndex: message.content.label,
            candidate: message.content.candidate
          });
          peerConns[message.from].addIceCandidate(candidate).then(() => onAddIceCandidateSuccess(peerConns[message.from]), err => onAddIceCandidateError(peerConns[message.from], err));
      } else if (message.content.type === 'disconnected') {
         messageBox.value += message.from + ' has left the room: ' + room + '\n';
         if (remoteVideos[message.from]) {
           remoteVideos[message.from].remove();
           delete remoteVideos[message.from];
           delete remoteStreams[message.from];
         }
         if (peerConns[message.from]) {
           peerConns[message.from].close;
           peerConns[message.from] = null;
         }
         isOfferedFrom[message.from] = false;
         isStartedWith[message.from] = false;
      } else if (message.content.type === 'responsed' && isOfferedFrom[message.from]) {
         isStartedWith[message.from] = true;
      }
    });

    ////////////////////////////////////////////////////
    let startTime;

    // Refer to README.MD to build your own stun and turn server
    var STUN = {
        urls: ['stun:stun.l.google.com:19302', 'stun:<Your EC2 Public IPs>:3478']
    };

    var TURN = {
        url: 'turn:<Your EC2 Public IPs>:5349?transport=udp',
        username: '<username>',
        credential: '<credentials>'
    };

    var pcConfig = {'iceServers':[STUN, TURN]};

    var localVideo = document.querySelector('#localVideo');
    var constraints = {
      audio: true,
      video: true
    };

    console.log('Getting user media with constraints', constraints);

    localVideo.addEventListener('loadedmetadata', function() {
      console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
    });

    function setupOnsizeEvent(remoteVideo) {
      remoteVideo.addEventListener('loadedmetadata', function() {
        console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
      });

      remoteVideo.onresize = () => {
        console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
        console.warn('RESIZE', remoteVideo.videoWidth, remoteVideo.videoHeight);
        // We'll use the first onsize callback as an indication that video has started
        // playing out.
        if (startTime) {
          const elapsedTime = window.performance.now() - startTime;
          console.log(`Setup time: ${elapsedTime.toFixed(3)}ms`);
          startTime = null;
        }
      };
    }

    function onAddIceCandidateSuccess(pc) {
      console.log(`addIceCandidate success`);
    }

    function onAddIceCandidateError(pc, error) {
      console.log(`failed to add ICE Candidate: ${error.toString()}`);
    }

    function start() {
       if (!window.navigator.onLine) {
         messageBox.value += 'Device is not connected to Internet.\n';
         return false;
       }
       if (sessionId === hostId) {
         isRoomInitiated = true;
         hangupButton.style.background  = 'DodgerBlue';
         hangupButton.style['pointer-events'] = 'auto';
         hangupButton.disabled = false;
         sendMessage({'room':room, 'from':sessionId, 'to':null, 'content': {type: 'conf is ready'}});
       }
       if (!isRoomInitiated) {
         messageBox.value += 'Conference has not been started by the host.\n';
         return false;
       }
       console.log('Requesting local stream');
       startButton.disabled = true;
       startButton.style['pointer-events'] = 'none';
       callButton.disabled = false;
       cameraButton.disabled = false;
       cameraButton.style['pointer-events'] = 'auto';
       muteButton.disabled = false;
       muteButton.style['pointer-events'] = 'auto';
       navigator.mediaDevices.getUserMedia(constraints)
       .then(gotStream)
       .catch(function(e) {
          alert('Device is busy or not ready.' + e.name);
       });
    }

    function gotStream(stream) {
      console.log('Adding local stream.');
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        console.log(`Using video device: ${videoTracks[0].label}`);
      }
      localVideo.srcObject = stream;
      localStream = stream;
      localStream.addTrack(videoTracks[0]);
      sendMessage({'room':room, 'from':sessionId, 'to':null, 'content': {type: 'got user media'}});
    }

    function muteMicrophone() {
       if (muteButton.value == "unmuted") {
          muteButton.value = "muted";
          muteButton.className = "fas fa-microphone";
          muteButton.title = "turn on microphone";
          console.log("Audio muted.");
       }
       else {
          muteButton.value = "unmuted"
          muteButton.className = "fas fa-microphone-slash";
          muteButton.title = "turn off microphone";
          console.log("Audio unmuted.");
       }
       localStream.getTracks().forEach((t) => {
          if (t.kind === 'audio') t.enabled = !t.enabled;
       });
    }

    function switchCamera() {
      if (cameraButton.value == "off") {
          cameraButton.value = "on";
          cameraButton.className = "fas fa-video-slash";
          cameraButton.title = "turn off camera";
      }
      else {
          cameraButton.value = "off";
          cameraButton.className = "fas fa-video";
          cameraButton.title = "turn on camera";
          const videoTracks = localStream.getVideoTracks();
      }
      localStream.getTracks().forEach((t) => {
          if (t.kind === 'video') t.enabled = !t.enabled;
      });
    }

    function maybeStart(to) {
      console.log('>>>>>>> maybeStart() ', isStartedWith[to], localStream);
      if (!isStartedWith[to] && localStream !== null) {
        console.log('>>>>>> creating peer connections', peerConns);
        createPeerConnection(to);
      }
    }

    window.onbeforeunload = function() {
      hangup();
    };

    /////////////////////////////////////////////////////////

    function createPeerConnection(to) {
      if (peerConns[to] !== null) {
           return false;
      }
      try {
        peerConns[to] = new RTCPeerConnection(pcConfig);
        peerConns[to].onicecandidate = function(event) {
            if (event.candidate) {
                sendMessage({
                  'room':room,
                  'from': sessionId,
                  'to':to,
                  'content': {
                     type: 'candidate',
                     label: event.candidate.sdpMLineIndex,
                     id: event.candidate.sdpMid,
                     candidate: event.candidate.candidate
                  }
                });
            } else {
                console.log('End of candidates.');
            }
        };

        peerConns[to].ontrack = function(event) {
            console.log('ontrack Event',event);
            if (to in remoteStreams && remoteStreams[to].id === event.streams[0].id) {
               remoteStreams[to].addTrack(event.track);
               remoteVideos[to].srcObject = remoteStreams[to];
               return true;
            }
            remoteStreams[to] = event.streams[0];
            remoteStreams[to].addTrack(event.track);
            hangupButton.style.background  = 'DodgerBlue';
            hangupButton.style['pointer-events'] = 'auto';
            hangupButton.disabled = false;
            var remoteVideo;
            remoteVideo = document.createElement('video');
            $(remoteVideo).attr('id', to);
            $(remoteVideo).attr('autoplay', 'autoplay');
            $(remoteVideo).attr('z-index', '1');
            $(remoteVideo).attr('height', '100%');
            $(remoteVideo).attr('width', '100%');
            $(remoteVideo).attr('max-width', '640px');
            $(remoteVideo).attr('margin-left', '5%');
            $("#remotevideos").append(remoteVideo);
            remoteVideos[to] = remoteVideo;
            remoteVideo.srcObject = remoteStreams[to];
            setupOnsizeEvent(remoteVideos[to]);
        }

        peerConns[to].onremovestream = handleRemoteStreamRemoved;
        peerConns[to].addStream(localStream);
        if (!isOfferedFrom[to]) {
          peerConns[to].createOffer(
          async (sessionDescription) =>  {
              console.log('setLocalAndSendMessage sending message', sessionDescription);
              await peerConns[to].setLocalDescription(sessionDescription,
                function() {
                    sendMessage({'room':room, 'from':sessionId, 'to': to, 'content': sessionDescription});
                    console.log("Offer setLocalDescription succeeded");
                },
                function(err) { console.log("Offer setLocalDescription failed!",err.message);
                });
          },
          handleCreateOfferError);
          console.log('Created RTCPeerConnnection ', to, " peerConns", peerConns[to]);
        }
      } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message);
        return;
      }
    }

    function handleCreateOfferError(event) {
      console.log('createOffer() error: ', event);
    }

    function call() {
      callButton.disabled = true;
      startTime = window.performance.now();
      console.log('Starting call', isOfferedFrom);
      for (key in peerConns) {
        if (isOfferedFrom[key]) {
          doAnswer(key);
          callButton.innerHTML = "Talking";
        }
      }
    }

    function doAnswer(to) {
      console.log('Sending answer to peer.');
      peerConns[to].createAnswer(
        function (sessionDescription) {
           console.log("sessionDescription is: ", sessionDescription);
           peerConns[to].setLocalDescription(sessionDescription,
              function() {
                sendMessage({'room':room, 'from': sessionId, 'to': to, 'content': sessionDescription});
                messageBox.value += sessionId + ' has joined the room: ' + room + '(Status: Talking...)\n';
                console.log("Offer setLocalDescription succeeded");
              },
              function(err) { console.log("Offer setLocalDescription failed!",err.message);
            });
        },
       onCreateSessionDescriptionError);
    }

    function onCreateSessionDescriptionError(error) {
      console.log('Failed to create session description: ' + error.toString());
    }

    function handleRemoteStreamRemoved(event) {
      console.log('Remote stream removed. Event: ', event);
    }

   function hangup() {
      console.log('Ending call');
      stop();
      if (sessionId === hostId) {
         socket.emit('closed', room);
         isRoomInitiated = false;
      } else {
         sendMessage({'room':room, 'from': sessionId, 'to': null, 'content': {type: 'disconnected'}});
         messageBox.value += sessionId + ' has left the room: ' + room + '\n';
      }
    }

    function handleRemoteHangup() {
      console.log('Session terminated.');
      isRoomInitiated = false;
      stop();
    }

    function stop() {
      startButton.disabled = false;
      startButton.style['pointer-events'] = 'auto';
      callButton.style.visibility = 'hidden';
      cameraButton.title = "turn off camera";
      cameraButton.className = "fas fa-video-slash";
      hangupButton.style.background  = 'grey';
      hangupButton.style['pointer-events'] = 'none';
      hangupButton.disabled = true;
      console.log(localStream);
      if (localStream !== null) {
        localStream.getTracks().forEach((t) => {
          t.stop();
        });
        localStream = null;
      }
      for (key in remoteVideos) {
        remoteVideos[key].remove();
        delete remoteVideos[key];
        delete remoteStreams[key];
      }
      for (key in peerConns) {
        if (peerConns[key]) {
          peerConns[key].close();
          peerConns[key] = null;
        }
        isOfferedFrom[key] = false;
        isStartedWith[key] = false;
      }
    }

});