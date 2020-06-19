import $ from 'jquery'
import route from './route.js'


const serializeData = () => (
    $('#settings')
    .serializeArray()
    .reduce((acc, {name, value}) => {
        acc[name] = value
        return acc
    }, {})
)


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

    socket.on('settings changed', data => {
        for (let [key, value] of Object.entries(data)) {
            $(`#settings > input[name=${key}]`).val(value)
        }
    })

    socket.on('start game', () => {
        route('/game')
    })

    $('#settings :input').prop('disabled', true)

    socket.on('adminrights', b => {
        if (b) {
            $('#settings :input').prop('disabled', false)

            $('#settings').submit(function(e) {
                e.preventDefault()
                const data = serializeData()
                socket.emit('start game', data)
            })
            
            $('#settings').change(function() {
                const settings = serializeData()
                socket.emit('settings changed', settings)
            })
        } else {
            $('#settings :input').prop('disabled', true)
            $('#settings').off()
        }
    })
}