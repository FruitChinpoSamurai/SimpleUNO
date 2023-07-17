const ws = new WebSocket(`ws://localhost:3000/`)

const UNO = () => {
    const [currentPlayer, setCurrentPlayer] = React.useState('')
    const [ownPlayer, setOwnPlayer] = React.useState('')
    const [messageType, setMessageType] = React.useState('')
    const [hand, setHand] = React.useState([])
    const [currentCard, setCurrentCard] = React.useState('')
    const [obscureCardsLengths, setObscureCardsLengths] = React.useState([{'card': '', 'length': 0}, {'card': '', 'length': 0}, {'card': '', 'length': 0}])
    const [hover, setHover] = React.useState([])
    const [wild, setWild] = React.useState('')
    const [playColor, setPlayColor] = React.useState('')

    // Handles messages or data received from the server.
    ws.onmessage = (event) => {
        // Convert received data or message into a readable format.
        const clientReceive = JSON.parse(event.data)

        // Before the start of the game.
        if (clientReceive.type === `start`) {
            setCurrentPlayer(clientReceive.player)
            setOwnPlayer(clientReceive.player)
            setMessageType(clientReceive.message)
        }
        // The game has now started. Display the base game state,
        // and keep receiving updates for the game state.
        else if (clientReceive.type === `turn`) {
            setCurrentPlayer(clientReceive.whoseTurn)
            setHand(clientReceive.hand)
            setMessageType(clientReceive.message)
            setCurrentCard(clientReceive.currentCard)
            setObscureCardsLengths([{'card': 'leftOpponent', 'length': clientReceive.obscured[0]}, {'card': 'upOpponent', 'length': clientReceive.obscured[1]}, {'card': 'rightOpponent', 'length': clientReceive.obscured[2]}])
            setHover(Array(hand.length).fill(false))
            setPlayColor(clientReceive.playWild)
        }
        // End the game.
        else if (clientReceive.type === `end`) {
            setCurrentPlayer(clientReceive.player)
            setMessageType(clientReceive.message)
        }
    }
    
    const handleCardClick = async (ev) => {
        let playedCard = ev.target.title
        // Check whether the correct player is playing the next card or not.
        if (ownPlayer === currentPlayer) {
            // If a wild is played, send a message back to the server so the game state will update.
            if (playedCard.split('-')[0] === 'black') {
                setMessageType(5)
                if (wild !== '') {
                    const toSend = {
                        type: 'play',
                        currentPlayedCard: playedCard,
                        player: ownPlayer,
                        color: wild
                    }
                    ws.send(JSON.stringify(toSend))
                }
                setWild('')
            }   // Checking whether a color from a played Wild card has been set or not.
                else if (playColor === '') {
                    // Checking whether the color or value of the played card
                    // match the color or value of the card in play.
                    if (playedCard.split('-')[0] !== 'black' && (playedCard.split('-')[0] === currentCard.split('-')[0] || playedCard.split('-')[1] === currentCard.split('-')[1])) {
                        const toSend = {
                            type: 'play',
                            currentPlayedCard: playedCard,
                            player: ownPlayer
                        }
                        ws.send(JSON.stringify(toSend))
                    } else {
                        setMessageType(3)
                    }
            } else {
                // If a color from a played Wild card is set, make players
                // try to match that instead of the usual case.
                if (playedCard.split('-')[0] === playColor) {
                    const toSend = {
                        type: 'play',
                        currentPlayedCard: playedCard,
                        player: ownPlayer
                    }
                    ws.send(JSON.stringify(toSend))
                } else {
                    setMessageType(3)
                }
            }
        } else {
            setMessageType(4)
        }
    }

    const chooseColor = async (ev) => {
        setWild(ev.target.title)
    }

    const handleDrawClick = async (ev) => {
        if (ownPlayer === currentPlayer) {
            const toSend = {
                type: 'draw',
                player: ownPlayer
            }
            ws.send(JSON.stringify(toSend))
        } else {
            setMessageType(6)
        }
    }

    return (
        <div className='container'>
            {/* The cards in the player's own hand. */}
            <div className='hand'>
            {
                hand.map((card, index) => (
                    <div className='cardBackground' style={{ backgroundColor: card.split("-")[0], opacity: hover[index] ? 0.5 : 1 }} key={index} 
                        title={card}
                        onMouseOver={()=>setHover(hover.slice(0, index).concat(['true'], hover.slice(index + 1)))} 
                        onMouseOut={()=>setHover(Array(hand.length).fill(false))} 
                        onClick={handleCardClick}
                    >
                        <span className='cardValue'>{ card.split("-")[1] }</span>
                    </div>
                ))
            }
            </div>
            {/* The card that is currently in play. */}
            <div className='currentCardInPlay'>
                <div className='cardBackground' style={{ backgroundColor: (playColor === '') ? currentCard.split('-')[0] : playColor }}>
                    <span className='cardValue'>{ currentCard.split('-')[1] }</span>
                </div>
            </div>
            {/* The cards of the other players. */}
            {
                obscureCardsLengths.map((type, index1) => (
                    <div className={type['card']} key={index1}>
                    {
                        [...Array(type['length'])].map((junk, index2) => (
                            <div className='cardBackground' style={{ backgroundColor: 'black', borderColor: 'white', borderStyle: 'dotted' }} key={index2}>
                                { (type['card'] === 'upOpponent') && <span className='cardValue' style={{ top: '17.5px', left: '12.5px', fontSize: '22px' }}>UNO</span> }
                                { ((type['length'] - 1) === index2 && type['card'] !== 'upOpponent') && <span className='cardValue' style={{ top: '17.5px', left: '12.5px', fontSize: '22px' }}>UNO</span> }
                            </div>
                        ))
                    }
                    </div>
                ))
            }
            {/* The text box and buttons. */}
            <div className='statusSection'>
                {/* The text box is responsible for relaying status, error, turn-related, and such messages to players. */}
                <div className='statusBox'>
                    { (messageType === 1) && <span className='statusValue'>{`${currentPlayer}`} has connected. Wait for more players to join.</span> }   
                    { (messageType === 2) && <span className='statusValue'>It is {`${currentPlayer}`}'s turn.</span> }
                    { (messageType === 3) && <span className='statusValue'>Illegal play. Either color or value doesn't match.</span> }
                    { (messageType === 4) && <span className='statusValue'>It is not your turn. It is {`${currentPlayer}`}'s turn.</span> }
                    { (messageType === 5) && 
                        <div>
                            <span className='statusValue'>Click on new color then click on Wild card again to confirm: </span>
                            <span title='red' onClick={chooseColor} style={{color: 'red'}}> Red </span>
                            <span title='blue' onClick={chooseColor} style={{color: 'blue'}}> Blue </span>
                            <span title='green' onClick={chooseColor} style={{color: 'green'}}> Green </span>
                            <span title='yellow' onClick={chooseColor} style={{color: 'yellow', WebkitTextStroke: '0.5px black'}}> Yellow </span>
                        </div>
                    }
                    { (messageType === 6) && <span className='statusValue'>You cannot draw a card outside of your turn.</span> }
                    { (messageType === 7) && <span className='statusValue'>{`${currentPlayer}`} is the winner!</span> }
                </div>
                {/* The buttons that can be used by players. */}
                {
                    (currentCard !== '') &&
                    <div className='statusButtons'>
                        <div className='buttonUNO'>
                            <span className='buttonText'>UNO!</span>
                        </div>
                        <div className='buttonDraw' onClick={handleDrawClick}>
                            <span className='buttonText'>Draw</span>
                        </div>
                    </div>
                }
            </div>
        </div>
    )
}

ReactDOM.render(<UNO />, document.querySelector(`#root`))