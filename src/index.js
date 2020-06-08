import io from 'socket.io-client'
import $ from 'jquery'
import route from './route'
import lobby from './lobby'

import './index.css'


$(function(){
    const socket = io();
    socket.on('errormsg', (msg, status) => {
        console.log(`error: ${status}\n message: ${msg}`)
    })
    socket.on('systemmsg', console.log)

    lobby(socket)

    $('#create-room-btn').click(() => {
        const name = $('#name-input').val()
        socket.emit('createRoom', { name })
    })
    
    $('#join-room-btn').click(() => {
        $('#cn-get-roomid').css('display', 'block')
        const roomId = (new URL(document.URL)).searchParams.get('room')
        if (roomId) {
            $('#id-input').val(roomId)
        }
    })
    
    $('.submit-id-btn').click((e) => {
        e.preventDefault()
        const name = $('#name-input').val() 
        const roomId = $('#id-input').val()
        const regex = RegExp('[a-zA-Z0-9]{8}');
        if (regex.test(roomId)) {
            console.log(roomId)
            socket.emit('joinRoom', { roomId, name })
        } else {
            alert('Die angegebene Id ist nicht gültig')
        }
    })
    
    socket.on('joinedRoom', (data) => {
        console.log(data)
        route('/lobby')
    })
    
})
