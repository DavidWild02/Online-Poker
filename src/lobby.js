import $ from 'jquery'
import route from './route.js'

export default (socket) => {
    socket.on('userList', (data) => {
        let children = Array
            .from(data)
            .reduce((acc, user) => acc + `
                <li user-id="${user.id}">
                    <p>${user.name}</p>
                </li>
            `, '')
        $('#lobby').html(children)
    })

    socket.on('startGame', () => {
        route('/game')
    })


    $('#settings').submit(function(e) {
        e.preventDefault()
        let data = $('#settings')
            .serializeArray()
            .reduce((acc, {name, value}) => {
                acc[name] = value
                return acc
            }, {}
        )
        socket.emit('startGame', data)
    })
}