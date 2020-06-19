import $ from 'jquery'


export default (socket) => {
    socket.on('startHand', console.log)
    socket.on('new round', console.log)
    socket.on('timed out', () => console.log('You timed out!'))
    socket.on('next', () => $('#fsd-game').prop('disabled', false))
    socket.on('game finished', console.log)

    $('#fsd-game > input[type="button"]').click(() => $('#fsd-game').prop('disabled', true))
    $('#b-check').click(() => socket.emit('action', { type: 'check', value: 0 }))
    $('#b-lay-down').click(() => socket.emit('action', { type: 'lay-down', value: 0 }))
    $('#b-bet').click(() => {
        const value = $('#i-bet').val()
        if (value >= 0)
            socket.emit('action', { type: 'bet', value })
        else 
            console.error('If you bet, the bet must be higher then the blind')
    })
}