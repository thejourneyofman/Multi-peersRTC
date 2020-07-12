from flask import Flask, render_template, url_for, request
from flask_socketio import SocketIO, join_room, leave_room, close_room, emit

app = Flask(__name__)
socketio=SocketIO(app,async_mode=None)
peers = {}

@app.route('/')
def index():
    return render_template('index.html', room='default')

@socketio.on('message', namespace='/')
def messgage(data):
    emit('message', data, broadcast=True, include_self=False)
    room = data['room']
    if data['content']['type'] == 'conf is ready':
        peers[room]["isActive"] = True
    elif data['content']['type'] == 'disconnected':
        leave_room(room)
        try:
            if request.sid in peers[room]['members']:
                peers[room]['members'].remove(request.sid)
        except:
            print("Failed to disconnect with ", request.sid)

@socketio.on('closed', namespace='/')
def closed(room):
    close_room(room)
    try:
        peers[room]["members"].clear()
        peers[room]["isActive"] = False
        emit('closed', {"room":room, "peers":peers}, broadcast=True, include_self=True)
    except:
        print("Failed to close room: ", room)

@socketio.on('created or joined', namespace='/')
def create_or_join(room):
    if room in peers and len(peers[room]["members"]) == 0:
        emit('created error', {"room": room, 'sid':request.sid, 'err': 'Room: '+room+' had been used OR is NOT active. Please re-enter a name.'}, broadcast=True, include_self=True)
    elif room is None or room == '':
        emit('created error', {"room": room, 'sid':request.sid, 'err': 'Room is empty. Please re-enter a name.'}, broadcast=True, include_self=True)
    else:
        join_room(room)
        if (room in peers):
            peers[room]["members"].append(request.sid)
        else:
            peers[room] = {"host":request.sid, "isActive": False, "members":[request.sid]}
        emit('created or joined', {"room": room, "sid":request.sid, "peers":peers}, broadcast=True, include_self=True)

@app.route('/<room>')
def room(room):
    return render_template('index.html', room=room)

if __name__ == '__main__':
    try:
        socketio.run(app, debug=True, host='0.0.0.0')
    except socketio.error as socketerror:
        print("Failed to start app.")

