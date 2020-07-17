# Multi-peersRTC
A simple many-to-many WebRTC group conference app

## Quickly build a turn server with CentOS (None SSL)

##### Launch an EC2 instance with Amazon Linux 2 AMI (HVM) or Amazon Linux AMI 2018.03.0 (HVM)
##### Configure AWS Security Group Inbound Rules
CustomUDP   UDP 8888    0.0.0.0/0

CustomUDP   TCP 8888    0.0.0.0/0

CustomUDP   UDP 50000-60000 0.0.0.0/0

##### Install packages (libevent & coturn)
```
$ sudo su
$ yum update -y && yum install -y make gcc cc gcc-c++ wget
$ yum install -y openssl-devel libevent libevent-devel mysql-devel mysql-server
$ wget https://github.com/libevent/libevent/releases/download/release-2.1.12-stable/libevent-2.1.12-stable.tar.gz
$ tar xvfz libevent-2.1.12-stable.tar.gz && cd libevent-2.1.12-stable.tar.gz
$ ./configure
$ make && make install
```
```
$ cd ..
$ wget -O turn.tar.gz http://turnserver.open-sys.org/downloads/v4.5.0.3/turnserver-4.5.0.3.tar.gz
$ tar -zxvf turn.tar.gz && cd turnserver-4.5.0.3
$ ./configure
$ make && make install
```
##### Configure turnserver
```
$ find / -name turnserver
/usr/local/bin/turnserver
$ cd /usr/local/bin/
$ vi turnserver.conf

listening-ip=<Your EC2 Private IPs>
listening-port=8888
min-port=50000
max-port=60000
relay-ip=<Your EC2 Private IPs>
external-ip=<Your EC2 Public IPs>
log-file=/var/log/turnserver.log
verbose
fingerprint
lt-cred-mech
user=<username>:<credentials>
```
##### Start and Test your turn server with [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice)
```
$ ./turnserver -c turnserver.conf


0: Wait for relay ports initialization...
0:   relay <Your EC2 Private IPs>initialization...
0:   relay <Your EC2 Private IPs> initialization done
0: Relay ports initialization done
0: IO method (general relay thread): epoll (with changelist)
0: turn server id=0 created
0: IPv4. TCP listener opened on : <Your EC2 Private IPs>:8888
0: IPv4. UDP listener opened on: <Your EC2 Private IPs>:8888
0: IO method (cli thread): epoll (with changelist)
0: IPv4. CLI listener opened on : 127.0.0.1:5766
0: IO method (auth thread): epoll (with changelist)

```
```
click https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
STUN or TURN URI: turn:<Your EC2 Private IPs>:8888?transport=udp
TURN username: <username>
TURN password: <credentials>
Click 'Add Server' & 'Gather candidates'

Time 	Component 	Type 	Foundation 	Protocol    <Address>   Port 	Priority
0.010	1	host	0	udp         <Address>   56114	126 | 32512 | 255
0.011	1	host	3	tcp          <Address>   9	125 | 32704 | 255
0.014	2	host	0	udp         <Address>   56115	126 | 32512 | 254
0.015	2	host	3	tcp          <Address>   9	125 | 32704 | 254
0.383	1	srflx	1	udp         <Address>   56114	100 | 32543 | 255
0.383	1	relay	2	udp         <Address>   13730	5 | 32543 | 255
0.413	2	srflx	1	udp         <Address>   56115	100 | 32543 | 254
0.414	2	relay	2	udp         <Address>   15146	5 | 32543 | 254
0.414	Done

Enjoy Relaying NAT!
```

## References
[Javascript Session Establishment Protocol](https://tools.ietf.org/id/draft-ietf-rtcweb-jsep-00.txt)


Copyright (c) 2020 Chao (Chase) Xu