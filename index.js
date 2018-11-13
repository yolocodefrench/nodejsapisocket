const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http)
let jwt = require('jsonwebtoken');
const config = require('config')
const user = require('./User/UserRoutes')
const userController = require('./User/UserController')
var mongoose = require('mongoose');

var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

var url = 'mongodb://127.0.0.1:27017/ionic-socketio';
mongoose.connect(url);
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error'));
db.on('open', function(){
	console.log('Connected');
});

var arrayUser = [];

let getUserById = (identifiant) => {
    var i = 0;
    for (i; i< arrayUser.length; i++) {
        if(arrayUser[i].id == identifiant) return i
    }
}
let getSocketFromId = (idToFind) => {
    let allUSersId = Object.keys(io.sockets.clients().connected);
    if (allUSersId.includes(idToFind)) return io.sockets.clients().connected[idToFind];
    return null;
}

io.on('connection', socket => {

    socket.on('send-list-user', ()=>{
        socket.emit('list-user', {tableau : arrayUser})
    })
    console.log('user connected : ', socket.id)
    socket.on('loaded', function (data) {
        console.log(data);
        socket.emit('Client loaded data', { my: 'data' });
    });

    socket.on('disconnect', function(){

    console.log("disconnection from : " + socket.id) 
    const userToDelete = getUserById(socket.id)
    
    arrayUser.splice(userToDelete, 1)
    });
     
    socket.on('set-nickname', (nickname) => {
    io.emit('users-changed', {user: nickname, event: 'joined'});    
    arrayUser.push({'id': socket.id, 'username': nickname})
    });
    
    socket.on('add-message', (message) => {
    io.emit('message', {text: message.text, from: message.nickname, created: new Date()});    
    });

    socket.on('send-list-user', ()=>{
        io.to(socket.id).emit('list-user', {tableau : arrayUser})
    })
    socket.on('private', (data) => {
        console.log(data['destinataire'])
        console.log(arrayUser)
        io.to(data['destinataire']).emit('message', data)
        io.to(socket.id).emit('message', data)
    })



})

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:8100");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    next();
  });

app.post('/', (req, res) => {
    userController.authenticate(req, res)
});
app.post('/create', (req, res) => {
    userController.create(req, res)
});

app.get('/', (req, res) => {
    res.sendFile(__dirname+'/views/index.html')
})

app.use(
    (req, res, next) => {
        try {

            if(!req.headers.authorization){
                next("token")
            }
            else{
                const token = req.headers.authorization.replace("Bearer ", "")
                jwt.verify(token, config.get('server.secret'));
                next();
            }
            
        } catch (error) {
            next(error)
        }
    }
);



app.use('/user', user)

app.use((err, req, res, next) => {
    if (err) {
        if (err == "token"){
            res.send('You have to provide a token')
        }
        console.log(err)
    }
    next();
});


http.listen(3000, () => {
    console.log('Server is running on http://localhost:3000')
})