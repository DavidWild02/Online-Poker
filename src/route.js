import $ from 'jquery'

export default (route) => {
    $('.route').removeClass('active')
    $(`div[route="${route}"]`).addClass('active')
}