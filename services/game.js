class Player {
    constructor(name, id, authkey = undefined) {
        this.id = id
        this.name = name
        this.authkey = authkey
    }
}

class PokerPlayer extends Player {
    constructor(name, id, money, authkey = undefined) {
        super(name, id, authkey)
        this.money = money
        this.active = true
        this.cards = []
    }
}

const generate_deck = () => {
    let deck = []
    for(let trumpf of ['Karo', 'Pik', 'Herz', 'Kreuz']) {
        for(let i = 2; i <= 10; i++) {
            deck.push(trumpf + ' ' + i)
        }
        deck.push(trumpf + '-Bube')
        deck.push(trumpf + '-Dame')
        deck.push(trumpf + '-König')
        deck.push(trumpf + '-Ass')
    }
    return deck
}

class Poker {
    constructor(players, settings) {
        this.players = players.reduce(
            (acc, {authkey, id, name}) => { 
                acc.push(new PokerPlayer(name, id, settings.initMoney, authkey))
                return acc
            }, []
        )
        this.actions = ['lay-down', 'bet', 'check']
        this.deck = []
        this.minBet = settings.minBet
        this.potMax = 0
        this.stage = 0
        this.beginner = 0
        this.current = this.beginner
    }

    verify(action, id) {
        action in this.actions && (action == 'lay-down' || this.current.id == id)
    }

    new_round() {
        this.deck = generate_deck()
        this.pot = 
        this.stage = 0
        this.beginner = 0
        this.current = this.beginner
    }

    next(action, data = {}) {
        switch (action) {
            case 'bet':

            case 'check': 
                // maybe delete this?
                break
            case 'lay-down':

                break
        }
    }

    evaluate() {

    }
}


module.exports.Player = Player
module.exports.Poker = Poker