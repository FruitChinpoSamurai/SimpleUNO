const fs = require(`fs`)
const http = require(`http`)
const WebSocket = require(`ws`)

// File reading.
const readFile = (fileName) =>
  new Promise((resolve, reject) => {
    fs.readFile(fileName, (readErr, fileContents) => {
      if (readErr) {
        reject(readErr)
      } else {
        resolve(fileContents)
      }
    })
})

// Creates the server and handles for files that need to be read from.
const server = http.createServer(async (req, resp) => {
  if (req.url == `/`) {
    const clientHtml = await readFile(`client.html`)
    resp.end(clientHtml)
  } else if (req.url == `/myjs`) {
    const clientJs = await readFile(`client.js`)
    resp.end(clientJs)
  } else if (req.url == `/uno.css`) {
    const clientCss = await readFile(`uno.css`)
    resp.end(clientCss)
  } else {
    resp.end(`Not found`)
  }
})

// Have the server listen to the client on Port 8000.
server.listen(8000)

// Set the server's Port to 3000.
const wss = new WebSocket.Server({ port: 3000 })

// Initialize all the different types of cards.
const redCards = [ 'red-0', 'red-1', 'red-2', 'red-3', 'red-4', 'red-5', 'red-6', 'red-7', 'red-8', 'red-9', 'red-D', 'red-S', 'red-R' ]
const blueCards = [ 'blue-0', 'blue-1', 'blue-2', 'blue-3', 'blue-4', 'blue-5', 'blue-6', 'blue-7', 'blue-8', 'blue-9', 'blue-D', 'blue-S', 'blue-R' ]
const greenCards = [ 'green-0', 'green-1', 'green-2', 'green-3', 'green-4', 'green-5', 'green-6', 'green-7', 'green-8', 'green-9', 'green-D', 'green-S', 'green-R' ]
const yellowCards = [ 'yellow-0', 'yellow-1', 'yellow-2', 'yellow-3', 'yellow-4', 'yellow-5', 'yellow-6', 'yellow-7', 'yellow-8', 'yellow-9', 'yellow-D', 'yellow-S', 'yellow-R' ]
const blackCards = [ 'black-W', 'black-Z' ]

// Quickly make a deck of 112 cards.
const deck = redCards.concat(redCards, blueCards, blueCards, greenCards, greenCards, yellowCards, yellowCards, blackCards, blackCards, blackCards, blackCards)

// Shuffle the deck.
deck.sort(() => Math.random() - 0.5)

// Give every player 7 starting cards.
// Slicing is not inplace.
const player1 = deck.slice(0, 7)
const player2 = deck.slice(7, 14)
const player3 = deck.slice(14, 21)
const player4 = deck.slice(21, 28)

// Counters for players.
const players = []
const playersHands = []

// Remove the first 28 cards from the deck.
// Splicing is inplace.
deck.splice(0, 28)

// Keep track of whose turn and what card it was.
let previousTurnData = ''
let previousCardData = ''

// For wild cards.
const wildColor = ['']

// For when a client connects.
wss.on(`connection`, (ws) => {

  // For when a client sends back messages or data.
  ws.on(`message`, (toSend) => {
    // The server receives the data sent by the handleCardClick() and
    // handleDrawClick() functions in the client.
    const receivedData = JSON.parse(toSend)
    // Check whether the player has drawn a card.
    if (receivedData.type !== 'draw') {
      // Update the player's hand, i.e., remove the played card from their hand.
      if (receivedData.player === previousTurnData) {
        let playerNumber = previousTurnData.slice(-1) - 1
        let thisHand = playersHands[playerNumber]
        let index = thisHand.indexOf(receivedData.currentPlayedCard)
        if (index > -1) {
          thisHand.splice(index, 1)
          playersHands[playerNumber] = thisHand
        }
      }
      if (receivedData.currentPlayedCard.split('-')[0] === 'black') {
        wildColor.push(receivedData.color)
        if (receivedData.currentPlayedCard.split('-')[1] === 'Z') {
          let playerDrawedOn = players[0].slice(-1) - 1
          let DrawedOnsHand = playersHands[playerDrawedOn]
          DrawedOnsHand.push(deck.shift())
          DrawedOnsHand.push(deck.shift())
          DrawedOnsHand.push(deck.shift())
          DrawedOnsHand.push(deck.shift())
          playersHands[playerDrawedOn] = DrawedOnsHand
        }
      } else if (receivedData.currentPlayedCard.split('-')[1] === 'R') {
        // Simply reverse the players array.
        players.reverse()
      } else if (receivedData.currentPlayedCard.split('-')[1] === 'S') {
        // Skip a player by taking their turn and putting it at the back of the players array.
        playerSkipped = players.shift()
        players.push(playerSkipped)
      } else if (receivedData.currentPlayedCard.split('-')[1] === 'D') {
        // Make the next player draw two cards.
        let playerDrawedOn = players[0].slice(-1) - 1
        let DrawedOnsHand = playersHands[playerDrawedOn]
        DrawedOnsHand.push(deck.shift())
        DrawedOnsHand.push(deck.shift())
        playersHands[playerDrawedOn] = DrawedOnsHand
      }
      // Part of game state updating.
      deck.push(previousCardData)
      cardData = receivedData.currentPlayedCard
      previousCardData = cardData
    } else {
      let playerDrawed = previousTurnData.slice(-1) - 1
      let DrawedHand = playersHands[playerDrawed]
      DrawedHand.push(deck.shift())
      playersHands[playerDrawed] = DrawedHand
      // Part of game state updating.
      cardData = previousCardData
    }
    // Update the game state for all players.
    let playerNumber = previousTurnData.slice(-1) - 1
    let thisHand = playersHands[playerNumber]
    if (thisHand.length === 0) {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: `end`,
            player: previousTurnData,
            hand: [],
            obscured: [0, 0, 0],
            playWild: ``,
            message: 7
          }))
        }
      })
    } else {
      turnData = players.shift()
      previousTurnData = turnData
      forWild = wildColor.pop()
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          handData = playersHands.shift()
          handLengths = [playersHands[0].length, playersHands[1].length, playersHands[2].length]
          client.send(JSON.stringify({
            type: `turn`,
            hand: handData,
            whoseTurn: turnData,
            obscured: handLengths,
            currentCard: cardData,
            playWild: forWild,
            message: 2
          }))
          playersHands.push(handData)
        }
      })
      players.push(turnData)
      wildColor.push('')
    }
  })

  // Wait for 4-players to join.
  if (wss.clients.size === 1) {
    ws.send(JSON.stringify({
      type: `start`,
      player: `player1`,
      message: 1
    }))
    players.push('player1')
    playersHands.push(player1)
  } else if (wss.clients.size === 2) {
    ws.send(JSON.stringify({
      type: `start`,
      player: `player2`,
      message: 1
    }))
    players.push('player2')
    playersHands.push(player2)
  } else if (wss.clients.size === 3) {
    ws.send(JSON.stringify({
      type: `start`,
      player: `player3`,
      message: 1
    }))
    players.push('player3')
    playersHands.push(player3)
  } else if (wss.clients.size === 4) {
    ws.send(JSON.stringify({
      type: `start`,
      player: `player4`,
      message: 1
    }))
    players.push('player4')
    playersHands.push(player4)
  }

  // Start the game, after 4th player joins, by sending everyone their
  // cards, the card in play, and whose turn it is.
  if (players.length === 4) {
    deckData = deck.shift()
    // Ensuring that the very first card in play is not a wild, reverse, skip, nor draw two.
    while (deckData.split('-')[0] === 'black' || deckData.split('-')[1] === 'R' || deckData.split('-')[1] === 'S' || deckData.split('-')[1] === 'D') {
      deck.push(deckData)
      deckData = deck.shift()
    }
    previousCardData = deckData
    turnData = players.shift()
    previousTurnData = turnData
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        handData = playersHands.shift()
        handLengths = [playersHands[0].length, playersHands[1].length, playersHands[2].length]
        client.send(JSON.stringify({
          type: `turn`,
          hand: handData,
          whoseTurn: turnData,
          obscured: handLengths,
          currentCard: deckData,
          playWild: ``,
          message: 2
        }))
        playersHands.push(handData)
      }
    })
    players.push(turnData)
  }
}) 