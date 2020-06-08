const Player = require('./services/game').Player
const Poker = require('./services/game').Poker


let lobbies = {}

module.exports = io => {
    io.on('connection', (socket) => {    
        socket.on('createRoom', ({ name }) => {
            const roomId = Math.random().toString(36).slice(2, 10)
            socket.join(roomId)
            console.log(`socket ${socket} has entered the room ${roomId}`)
            socket.emit('joinedRoom', roomId)
            lobbies[roomId] = { 
                userList: {
                    [socket.id]: new Player(name, socket.id),
                },
            }
        })

        socket.on('joinRoom', ({roomId, name}) => {
            if (!(roomId in io.sockets.adapter.rooms)) {
                socket.emit('errormsg', 'The room is not existing', '404')
            } else if (roomId in socket.rooms) {
                socket.emit('errormsg', 'You have already joined the room', '403')
            } else {
                socket.join(roomId)
                socket.emit('joinedRoom', roomId)
                socket.broadcast.to(roomId).emit('systemmsg', socket.id + ' has entered the lobby')
                lobbies[roomId].userList[socket.id] = new Player(name, socket.id)
                const userList = lobbies[roomId].userList
                io.to(roomId).emit('userList', userList)
            }
        })

        socket.on('startGame', (room, settings) => {
            lobbies[room].game = new Poker(lobbies[room].userList.values(), settings)
            io.to(room).emit('startGame')
        })
    
        socket.on('action', (action, data, room) => {
            let game = lobbies[room].game
            if (game.verify(action, socket.id)) {
                let ret = game.next(action, data)
                io.to(room).emit('action', ret)
            }
        })

        socket.on('disconnect', () => {
            console.log('Socket disconnected: ' + socket.id)
            for(let room of socket.rooms.filter(item => item in lobbies)) {
                socket.broadcast.to(room).emit('systemmsg', socket.id + ' has left the lobby')
                delete lobbies[room].userList[socket.id]
                const userList = lobbies[room].userList 
                socket.broadcast.to(room).emit('userList', userList)
            }
        })
    })
}