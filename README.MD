# Multi-peersRTC
A simple many-to-many WebRTC group conference app

## Quickly build a stun and turn server with AWS (CentOS)

##### Launch an EC2 instance with Amazon Linux 2 AMI (HVM) or Amazon Linux AMI 2018.03.0 (HVM)
##### Configure AWS Security Group Inbound Rules
CustomUDP   UDP 3478    0.0.0.0/0

CustomUDP   TCP 3478    0.0.0.0/0

CustomUDP   UDP 5349    0.0.0.0/0

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
##### Create user using turnadmin

```
$ find / -name turnserver
/usr/local/bin/turnserver
$ echo "export PATH=$PATH:/usr/local/bin" >> ~/.bashrc
$ source ~/.bashrc
$ turnadmin -k -u <username> -r <domain> -p <credentials>
<MD5 hash string>
$ cd /usr/local/bin/
$ vim turnuserdb.conf
<username>:<MD5 hash string>
```
##### Generate signatures
```
openssl req -x509 -newkey rsa:2048 -keyout /etc/turnserver_pkey.pem -out /etc/turnserver_cert.pem -days 99999 -nodes
```
##### Configure turnserver
```
$ vi turnserver.conf

relay-device=eth0
listening-ip=<Your EC2 Private IPs>
listening-port=3478
itls-listening-port=5349
min-port=10000
max-port=20000
relay-ip=<Your EC2 Private IPs>
external-ip=<Your EC2 Public IPs>
relay-threads=50
lt-cred-mech
cert=/etc/turnserver_cert.pem
pkey=/etc/turnserver_pkey.pem
server-name=<domain>
realm=<domain>
log-file=/var/log/turnserver.log
verbose
fingerprint
userdb=/usr/local/bin/turnuserdb.conf
user=<username>:<credentials>
user=<username>:<MD5 hash string>
```
##### Start and Test your stun and turn server with [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice)
```
$  turnserver -l <Your EC2 Private IPs>  -a -c /usr/local/bin/turnserver.conf

0: Wait for relay ports initialization...
0:   relay <Your EC2 Private IPs>initialization...
0:   relay <Your EC2 Private IPs> initialization done
0: Relay ports initialization done
0: IO method (general relay thread): epoll (with changelist)
0: turn server id=0 created
0: IPv4. TCP listener opened on : <Your EC2 Private IPs>:3478
0: IPv4. UDP listener opened on: <Your EC2 Private IPs>:3478
0: IO method (cli thread): epoll (with changelist)
0: IPv4. CLI listener opened on : 127.0.0.1:5766
0: IO method (auth thread): epoll (with changelist)

```
```
click https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

STUN or TURN URI: stun:<Your EC2 Public IPs>:3478
TURN username: <None>
TURN password: <None>

STUN or TURN URI: turn:<Your EC2 Public IPs>:5349?transport=udp
TURN username: <username>
TURN password: <credentials>

Click 'Add Server' & 'Gather candidates'

Time 	Component 	Type 	Foundation 	Protocol    <Address>   Port 	Priority
0.010	1	host	0	udp         <Address>   56114	126 | 32512 | 255
0.011	1	host	3	tcp         <Address>   9	125 | 32704 | 255
0.014	2	host	0	udp         <Address>   56115	126 | 32512 | 254
0.015	2	host	3	tcp         <Address>   9	125 | 32704 | 254
0.383	1	srflx	1	udp         <Address>   56114	100 | 32543 | 255
0.383	1	relay	2	udp         <Address>   13730	5 | 32543 | 255
0.413	2	srflx	1	udp         <Address>   56115	100 | 32543 | 254
0.414	2	relay	2	udp         <Address>   15146	5 | 32543 | 254
0.414	Done
```
##### Stop the service
```
$ ps -ef | grep turnserver
$ kill -9 [PID]

Happy relaying!
```

## References
##### 1. [Javascript Session Establishment Protocol](https://tools.ietf.org/id/draft-ietf-rtcweb-jsep-00.txt)
##### 2. [STUN IP Address requests](https://github.com/diafygi/webrtc-ips)

Copyright (c) 2020 Chao (Chase) Xu