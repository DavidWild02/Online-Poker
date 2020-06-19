const { once, EventEmitter } = require('events')


class User {
    constructor(name, id, authkey = undefined) {
        this.id = id
        this.name = name
        this.authkey = authkey
    }
}

class PokerPlayer extends User {
    constructor(name, id, money, authkey = undefined) {
        super(name, id, authkey)
        this.money = money
        this.active = true
        this.cards = []
    }
}

class Card {
    constructor(schlag, trumpf) {
        this.trumpf = trumpf
        this.schlag = schlag
    }
}

const generate_deck = () => {
    let deck = []
    for(let trumpf of ['Karo', 'Pik', 'Herz', 'Kreuz']) {
        for(let i = 2; i <= 14; i++) {
            deck.push(new Card(i, trumpf))
        }
    }
    return deck
}

const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

class Poker {
    constructor(players, settings, emitter) {
        this.players = players.reduce(
            (acc, {authkey, id, name}) => { 
                acc.push(new PokerPlayer(name, id, parseInt(settings.initMoney), authkey))
                return acc
            }, []
        )
        this.blind = parseInt(settings.blind)
        this.beginner = 0//settings.beginner
        this.current = 0//settings.beginner
        this.emitter = emitter
        this.timedOutLimit = parseInt(settings.timedOutLimit)
        
        this.start()
    }

    verify(action, id) {
        if (action.type == 'bet' && action.value < this.blind) {
            return false
        }
        return id == this.players[this.current].id && ['lay-down', 'bet', 'check'].includes(action.type)
    }

    get_score(cardsTable, cardsHand) {
        const cards = [...cardsHand, ...cardsTable]
        const sorted = cards.sort((a, b) => a.schlag - b.schlag)
    
        //Straight & StraighFlush
        let straightScore = 0
        let count = 0
        for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].schlag + 1 == sorted[i + 1].schlag) 
                count++
            else
                count = 0
    
            if (count == 4) {
                straightScore = sorted[i+1].schlag * 100000
                // StraightFlush
                const isStraightflush = sorted.slice(i-3,i+2)
                    .every(card => card.trumpf == sorted[i].trumpf)
                if (isStraightflush) {
                    straightScore *= 10000
                }
                break
            }
        }
    
        //Flush
        let flushScore = 0
        for (let trumpf of ['Pik', 'Karo', 'Herz', 'Kreuz']) {
            let fcards = sorted.filter(item => item.trumpf == trumpf)
            if (fcards.length >= 5) {
                if (cardsHand[0].trumpf == trumpf && cardsHand[0].schlag >= fcards[4].schlag)
                    flushScore = cardsHand[0].schlag * 1000000 + cardsHand[1].schlag
                else if (cardsHand[1].trumpf == trumpf && cardsHand[1].schlag >= fcards[4].schlag)
                    flushScore = cardsHand[1].schlag * 1000000 + cardsHand[0].schlag
                // EDGE-CASE: Flush liegt auf dem Tisch. Nix oder etwas in der Hand
                break
            }
        }
    
        // Pairs, Poker, etc...
        let counter = {}
        for(let card of sorted) {
            if (card.schlag in counter)
                counter[card.schlag]++
            else
                counter[card.schlag] = 1
        }
    
        let best = 0
        let best2 = 0
        for (let [key, val] of Object.entries(counter)) {
            const actual = parseInt(key) * Math.pow(10, val)
            if (actual > best) {
                best2 = best
                best = actual
            }
            if (actual < best && actual > best2) {
                best2 = actual
            }
        }
    
        let score = best
        if (best >= 20000) {
            score *= 10000
        } else if (best2 >= 200) {
            if (best2 > 1400) {
                // handling EDGE-CASE: two tripples
                best2 /= 10
            }
            score += best2 / 100
            score *= 10
            if (best >= 2000) {
                score *= 1000
            }
        } else if (best >= 2000) {
            score *= 10
        }
    
        if (flushScore > score) {
            score = flushScore
        } 
        if (straightScore > score) {
            score = straightScore
        }
    
        return score
    }

    evaluate(cardsTable) {
        this.players.forEach(player => {
            if (player.cards[0].schlag < player.cards[1].schlag) {
                const temp = player.cards[0]
                player.cards[0] = player.cards[1]
                player.cards[1] = temp
            }
        })
        const scoreList = this.players.map(player => ({
            player,
            score: this.get_score(cardsTable, player.cards),
            scoreHand: player.cards[0].schlag * 100 + player.cards[1].schlag
        }))
        .sort((a, b) => {
            let diff = b.score - a.score
            if(diff == 0) {
                diff = b.scoreHand - a.scoreHand
            }
            return diff
        })

        return scoreList
    } 

    async start() {
        let deck = shuffle(generate_deck())
        
        let openCards = []
        const pot = []
        for (let i = 0; i < this.players.length; i++){
            pot.push(0)
        }
        this.current = this.beginner
        let index_players = this.beginner

        this.players[this.current].money -= this.blind
        pot[this.current] += this.blind

        for (let i = 0; i <= 3; i++) {
            if (i == 0) {
                for (let p = 0; p < this.players.length; p++) {
                    this.players[p].cards = deck.splice(0, 2)
                }
                this.emitter.emit('game-begin', { players: this.players, pot})
            } else if (i == 1) {
                openCards = deck.splice(0, 3) 
            } else {
                openCards.push(deck.pop())
            }
            this.emitter.emit('new round', openCards)
            
            let bet_man = index_players % this.players.length
            index_players++
            while(true) {
                this.current = index_players % this.players.length
                if (!this.players[this.current].active) {
                    index_players++
                    continue
                }
                this.emitter.emit('next', this.players[this.current].id)
    
                let action
                try {
                    const get_input = async () => {
                        let begin = Date.now()
                        let timer = setInterval(() => {
                            if (Math.abs(Date.now() - begin) / 1000 >= this.timedOutLimit) {
                                clearInterval(timer)
                                throw "timed out"
                            }
                        }, 1000)
                        const result = await once(this.emitter, 'action')
                        clearInterval(timer)
                        return result[0]
                    }
                    action = await get_input()
                } 
                catch(err) {
                    if(err == 'timed out') {
                        this.players[this.current].active = false
                        this.emitter.emit(err, this.players[this.current].id)
                        if (this.current == bet_man){
                            while(!this.players[index_players % this.players.length].active) {
                                index_players--
                                if (index_players < 0) {
                                    index_players += this.players.length
                                }
                            }
                            break
                        }
                        continue
                    }
                    console.log(err)
                }
                let val = 0
                switch (action.type) {
                    case 'lay-down':
                        delete pot[this.current]
                        this.players[this.current].active = false
                    break
                    case 'bet':
                        let up = action.value
                        val += Number(up)
                        bet_man = this.current
                        index_players = this.current
                    case 'check':
                        val += Math.max(...Object.values(pot)) - pot[this.current]
                        this.players[this.current].money -= val
                        pot[this.current] += val
                    break
                }
    
                if (index_players - bet_man == this.players.length) {
                    index_players = bet_man
                    break
                } 
                index_players++
            }
        }

        const scoreList = evaluate(openCards)
        this.emitter.emit('game finished', {scoreList, pot})
        const index = this.players.findIndex(item => item.id = scoreList[0].id)
        this.players[index].money += Object.values(pot).reduce((a, b) => a + b, 0)
        while(true) {
            this.beginner = (++this.beginner) % this.players.length
            if (this.players[this.beginner].active) break
        }
    }
}


module.exports.User = User
module.exports.Poker = Poker