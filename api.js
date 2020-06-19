const User = require('./services/game').User
const Poker = require('./services/game').Poker

const { EventEmitter } = require('events')
const socketIO = require('socket.io')



let lobbies = {}

module.exports = server => {
    const io = socketIO(server)

    io.on('connection', (socket) => {    
        socket.on('createRoom', ({ name }) => {
            const roomId = Math.random().toString(36).slice(2, 10)

            if (socket.cRoom) {
                socket.leave(socket.cRoom)
            }
            socket.join(roomId)
            socket.cRoom = roomId   

            console.log(`socket ${socket} has entered the room ${roomId}`)
            socket.emit('joinedRoom', roomId)
            socket.emit('adminrights', true)
            lobbies[roomId] = { 
                userList: {
                    [socket.id]: new User(name, socket.id),
                },
                admin: socket.id
            }
        })

        socket.on('joinRoom', ({roomId, name}) => {
            if (!(roomId in io.sockets.adapter.rooms)) {
                socket.emit('errormsg', 'The room is not existing', '404')
            } else if (roomId == socket.cRoom) {
                socket.emit('errormsg', 'You have already joined the room', '403')
            } else {
                // ensure that the socket is in only one room at a time
                if (socket.cRoom) {
                    socket.leave(socket.cRoom)
                }
                socket.join(roomId)
                socket.cRoom = roomId

                socket.emit('joinedRoom', roomId)
                socket.broadcast.to(roomId).emit('systemmsg', socket.id + ' has entered the lobby')
                lobbies[roomId].userList[socket.id] = new User(name, socket.id)
                const userList = lobbies[roomId].userList
                io.to(roomId).emit('userList', userList)
            }
        })

        socket.on('settings changed', settings => {
            if (socket.id == lobbies[socket.cRoom].admin)
                socket.broadcast.to(socket.cRoom).emit('settings changed', settings)
        })

        socket.on('start game', settings => {
            if (socket.id == lobbies[socket.cRoom].admin) {
                io.to(socket.cRoom).emit('start game')
                lobbies[socket.cRoom].game = new Poker(Object.values(lobbies[socket.cRoom].userList), settings, create_channel(socket.cRoom))
            }
        })
    
        socket.on('action', action => {
            if (lobbies[socket.cRoom].game.verify(action, socket.id)) {
                lobbies[socket.cRoom].game.emitter.emit('action', action)
            } else {
                socket.emit('errmsg', 'Error: The action was invalid or you werent supposed to act')
            }
        })

        socket.on('disconnect', () => {
            console.log('Socket disconnected: ' + socket.id)
            if (socket.cRoom) {
                const room = socket.cRoom
                socket.broadcast.to(room).emit('systemmsg', socket.id + ' has left the lobby')
                delete lobbies[room].userList[socket.id]
                if (lobbies[room].admin == socket.id && lobbies[room].userList.length > 0) {
                    lobbies[room].admin = Object.keys(lobbies[room].userList)[0]
                    io.to(lobbies[room].admin).emit('adminrights', true)
                }
                const userList = lobbies[room].userList 
                socket.broadcast.to(room).emit('userList', userList)
            }
        })
    })

    // Sehr sehr große Baustelle
    const create_channel = (roomId) => {
        const emitter = new EventEmitter()

        emitter.on('game-begin', data => {
            data.players.forEach(player => io.to(player.id).emit('startHand', {cardsHand: player.cards, pot: data.pot}))
        })
        emitter.on('new round', data => io.to(roomId).emit('new round', data))
        emitter.on('timed out', socketId => {
            io.to(roomId).emit('timed out', socketId)
            io.to(socketId).disconnect(true)
            // Does disconnect fire up the disconnect event, if it is set on false?
            //delete lobbies[roomId].userList[socketId]
        })
        emitter.on('next', socketId => io.to(socketId).emit('next'))
        emitter.on('game finished', data => io.to(roomId).emit('game finished', data))
        
        return emitter
    }

    return io
}
