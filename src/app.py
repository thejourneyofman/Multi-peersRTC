from flask import Flask, render_template, url_for, request
from flask_socketio import SocketIO,join_room,leave_room,emit

app = Flask(__name__)
socketio=SocketIO(app,async_mode=None)
peers = {}

@app.route('/')
def index():
    return render_template('index.html', room='default')

@socketio.on('message', namespace='/')
def messgage(data):
    emit('message', data, broadcast=True, include_self=False)

@socketio.on('disconnected', namespace='/')
def disconnect(room):
    leave_room(room)
    for key, clients in peers.items():
        try:
            clients['members'].remove(request.sid)
        except:
            print("Failed!")

@socketio.on('created or joined', namespace='/')
def create_or_join(room):
    join_room(room)
    if (room in peers):
        peers[room]["members"].append(request.sid)
    else:
        peers[room] = {"host":request.sid, "members":[request.sid]}
    emit('created or joined', {"sid":request.sid, "peers":peers}, broadcast=True, include_self=True)

@app.route('/<room>')
def room(room):
    return render_template('index.html', room=room)

if __name__ == '__main__':
    try:
        socketio.run(app, debug=True, host='0.0.0.0')
    except socketio.error as socketerror:
        print("Error!")

